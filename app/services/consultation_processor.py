from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import Consultation, ConsultationStatus, AudioFile, SOAPNote, PatientProfile, AILog
from app.services.stt_service import AssemblyAIService
from app.services.llm_service import GeminiService
from app.services.triage_service import TriageService
from app.services.safety_service import SafetyService
from uuid import UUID
import asyncio
import time
from datetime import datetime, timedelta
import re

async def process_transcription_only(consultation_id: UUID, audio_file_id: UUID = None):
    """
    Step 1: Transcribe Audio Only
    """
    print(f"Starting TRANSCRIPTION for consultation {consultation_id}")
    with Session(engine) as session:
        consultation = session.get(Consultation, consultation_id)
        if not consultation:
            print(f"Consultation {consultation_id} not found.")
            return

        # Update Status
        consultation.status = ConsultationStatus.IN_PROGRESS
        session.add(consultation)
        
        # Get Audio File
        if audio_file_id:
             audio_file = session.get(AudioFile, audio_file_id)
        else:
            audio_file = session.exec(select(AudioFile).where(AudioFile.consultation_id == consultation_id).order_by(AudioFile.uploaded_at.desc())).first()
            
        if not audio_file:
            print("Audio file missing.")
            return

        try:
            # Transcribe
            print(f"Translating audio: {audio_file.file_url}")
            transcript_result = await AssemblyAIService.transcribe_audio_async(audio_file.file_url)
            transcript_text = transcript_result["text"]
            # utterances = transcript_result.get("utterances", []) # Not storing utterances in AudioFile for now
            
            # Save Transcript
            audio_file.transcription = transcript_text
            session.add(audio_file)
            session.commit()
            print(f"Transcription saved for {consultation_id}")
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Transcription failed: {e}")
            with open("debug_run.log", "a") as f:
                f.write(f"\n[ERROR] Transcription {consultation_id}: {str(e)}\n{error_trace}\n")
            consultation.status = ConsultationStatus.FAILED
            consultation.requires_manual_review = True
            session.add(consultation)
            session.commit()
            raise e

async def process_soap_generation(consultation_id: UUID):
    """
    Step 2: Generate SOAP from existing Transcript
    """
    print(f"Starting SOAP GENERATION for consultation {consultation_id}")
    with Session(engine) as session:
        consultation = session.get(Consultation, consultation_id)
        if not consultation:
            print(f"Consultation {consultation_id} not found.")
            return

        # Get Latest Audio File for Transcript
        audio_file = session.exec(select(AudioFile).where(AudioFile.consultation_id == consultation_id).order_by(AudioFile.uploaded_at.desc())).first()
        
        if not audio_file or not audio_file.transcription:
            print("No transcript found for SOAP generation.")
            consultation.status = ConsultationStatus.FAILED
            consultation.requires_manual_review = True
            session.add(consultation)
            session.commit()
            return

        transcript_text = audio_file.transcription
        # We might lose 'utterances' if not stored in DB. For now, pass empty list or we need to add 'transcript_metadata' to AudioFile.
        # Assuming we just use text for now or re-fetch if AssemblyAI supports it (expensive).
        # Let's assume text-only for now or add metadata field later.
        utterances = [] 

        # Patient Context
        patient_profile = session.exec(select(PatientProfile).where(PatientProfile.user_id == consultation.patient_id)).first()
        patient_context = {}
        if patient_profile:
            age = "N/A"
            if patient_profile.date_of_birth:
                today = datetime.now()
                dob = patient_profile.date_of_birth
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            
            patient_context = {
                "first_name": patient_profile.first_name,
                "last_name": patient_profile.last_name,
                "age": age,
                "gender": patient_profile.gender,
                "notes": f"Address: {patient_profile.city}, {patient_profile.state}"
            }

        try:
            print("Generating SOAP note from transcript...")
            start_time = time.time()
            soap_data = await GeminiService.generate_soap_note_async(transcript_text, utterances, patient_context)
            latency = (time.time() - start_time) * 1000
            
            # Log Success
            session.add(AILog(
                consultation_id=consultation.id,
                model_version="gemini-2.0-flash",
                status="SUCCESS",
                latency_ms=latency
            ))

            soap_content = soap_data.get("soap_note", {})
            risk_flags = soap_data.get("risk_flags", [])

            # Create OR Update SOAP Note Record
            existing_soap = session.exec(select(SOAPNote).where(SOAPNote.consultation_id == consultation.id)).first()
            
            if existing_soap:
                 # Update
                 existing_soap.soap_json = soap_data # Store raw JSON for full fidelity
                 existing_soap.risk_flags = {"flags": risk_flags}
                 existing_soap.generated_by_ai = True
                 session.add(existing_soap)
                 soap_note = existing_soap # For downstream use (Triage)
                 print("Existing SOAP note updated.")
            else:
                # Create New
                soap_note = SOAPNote(
                    consultation_id=consultation.id,
                    soap_json=soap_data, # Store raw JSON for full fidelity
                    risk_flags={"flags": risk_flags}, # Wrap in dict as risk_flags is JSON type
                    generated_by_ai=True
                )
                session.add(soap_note)
                print("New SOAP note created.")
            
            # --- Auto-Update Demographics ---
            extracted_demo = soap_data.get("demographics", {})
            if patient_profile:
                updated_profile = False
                
                # Update Age/DOB if missing
                if not patient_profile.date_of_birth:
                    age_val = None
                    # Try from JSON
                    if extracted_demo.get("age"):
                         try: age_val = int(extracted_demo["age"])
                         except: pass
                    
                    # Fallback: Regex Search in Subjective
                    if not age_val:
                         import re
                         subj = soap_data.get("soap_note", {}).get("subjective", "")
                         # Matches: "84-year-old", "84 yo", "84 years"
                         match = re.search(r"(\d{1,3})[\s-]?(?:years?|yrs?|yo|y/o)(?:[\s-]?old)?", subj.lower())
                         if match:
                             try: age_val = int(match.group(1))
                             except: pass

                    if age_val and 0 < age_val < 120:
                        from datetime import datetime, timedelta
                        # Approximate DOB
                        dob = datetime.utcnow() - timedelta(days=age_val * 365)
                        patient_profile.date_of_birth = dob
                        updated_profile = True
                        print(f"Auto-updated Patient DOB based on Age: {age_val}")
                
                # Update Gender if missing or "Unknown"
                current_gender = (patient_profile.gender or "").lower()
                if (not current_gender or current_gender == "unknown") and extracted_demo.get("gender"):
                    gender_val = extracted_demo["gender"]
                    # Normalize simple cases
                    if gender_val.lower() in ["male", "m"]: gender_val = "Male"
                    elif gender_val.lower() in ["female", "f"]: gender_val = "Female"
                    
                    patient_profile.gender = gender_val
                    updated_profile = True
                    print(f"Auto-updated Patient Gender: {patient_profile.gender}")
                
                if updated_profile:
                    session.add(patient_profile)
                    session.commit()
                    session.refresh(patient_profile)

            # --- NEW: Auto-Fill Clinical Draft Fields ---
            # Populate the edit fields for the doctor using CONCISE summaries
            ui_summary = soap_data.get("ui_summary", {})
            
            if soap_content or ui_summary:
                def clean_text(text):
                    if not text: return ""
                    return text.replace("**", "").replace("__", "")

                # 1. Diagnosis
                # Prefer summary, fallback to assessment
                diag_text = ui_summary.get("diagnosis") or soap_content.get("assessment")
                if diag_text:
                    consultation.diagnosis = clean_text(diag_text)
                
                # 2. Prescription
                # Prefer summary, fallback to plan
                rx_text = ui_summary.get("prescription") or soap_content.get("plan")
                if rx_text:
                    consultation.prescription = clean_text(rx_text)
                
                # 3. Notes
                # Request: Internal notes should be EMPTY and prompted manually via UI placeholder.
                # We do NOT auto-fill this anymore.
                consultation.notes = ""

            # --- NEW: Phase 2 Logic ---
            # 5a. Triage Analysis
            if patient_profile:
                urgency, category = TriageService.calculate_urgency(soap_note, patient_profile)
                consultation.urgency_score = urgency
                consultation.triage_category = category
                print(f"Triage Result: {category} (Score: {urgency})")
            
            # 5b. Safety Checks
            if patient_profile:
                warnings = SafetyService.check_drug_interactions(soap_note, patient_profile)
                consultation.safety_warnings = warnings
                if warnings:
                    print(f"Safety Warnings Found: {len(warnings)}")

            # 6. Update Final Status
            # IMPORTANT: We do NOT mark as COMPLETED here. 
            # The doctor must review and sign off. We keep it IN_PROGRESS.
            consultation.status = ConsultationStatus.IN_PROGRESS
            # Reset manual review flag if it was set by previous error
            consultation.requires_manual_review = False
            
            session.add(consultation)
            session.commit()
            
            print(f"Processing successfully completed for {consultation_id} (Status: IN_PROGRESS)")
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Processing failed: {e}")
            
            # Log to file for agent visibility
            with open("debug_run.log", "a") as f:
                f.write(f"\n[ERROR] {consultation_id}: {str(e)}\n{error_trace}\n")

            # Set status to FAILED so we can track errors in DB
            consultation.status = ConsultationStatus.FAILED
            consultation.requires_manual_review = True # Flag for Manual Intervention
            
            # Log General Failure if not logged by LLM block
            session.add(consultation)
            session.commit()

