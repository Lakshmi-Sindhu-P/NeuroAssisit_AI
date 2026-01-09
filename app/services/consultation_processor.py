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
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich.theme import Theme

# Custom theme for better visibility
custom_theme = Theme({
    "info": "cyan",
    "warning": "yellow",
    "error": "bold red",
    "success": "bold green"
})
console = Console(theme=custom_theme)

async def process_transcription_only(consultation_id: UUID, audio_file_id: UUID = None):
    """
    Step 1: Transcribe Audio Only
    """
    console.rule(f"[bold blue]Step 1: Starting TRANSCRIPTION {consultation_id}")
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console,
        transient=False
    ) as progress:
        
        main_task = progress.add_task("[cyan]Initializing...", total=4)
        
        with Session(engine) as session:
            progress.update(main_task, description="[cyan]Fetching Consultation Data...", advance=1)
            consultation = session.get(Consultation, consultation_id)
            if not consultation:
                console.print(f"[error]Consultation {consultation_id} not found.[/error]")
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
                console.print("[error]Audio file missing.[/error]")
                return

            try:
                # Transcribe with AssemblyAI (Matching Patient UI reliability)
                progress.update(main_task, description=f"[bold yellow]Transcribing Audio with AssemblyAI (File: {audio_file.file_name})...", advance=1)
                
                # Construct local file path (AssemblyAI SDK handles upload automatically)
                import os
                file_path = os.path.join("uploads", audio_file.file_name)
                
                if not os.path.exists(file_path):
                     # Fallback if path construction fails (e.g. absolute paths in DB)
                     console.print(f"[warning]File not found at {file_path}, trying absolute URL logic...[/warning]")
                     # Note: In a real prod env with S3, we would pass the presigned URL.
                     # Here just fail if local file missing.
                     raise FileNotFoundError(f"Audio file not found at {file_path}")

                console.log(f"Sending audio to AssemblyAI: {file_path}")
                
                transcript_result = await AssemblyAIService.transcribe_audio_async(file_path)
                
                # Extract full text
                transcript_text = transcript_result.get("text", "")
                
                progress.update(main_task, description="[cyan]Saving Transcript to Database...", advance=1)
                
                # Save Transcript
                audio_file.transcription = transcript_text
                # Note: We aren't storing 'utterances' in DB yet, but could in future.
                
                session.add(audio_file)
                session.commit()
                
                progress.update(main_task, description="[bold green]Transcription Complete!", completed=4)
                console.print(f"[success]✓ Transcription saved successfully for {consultation_id}[/success]")
                
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                console.print(f"[error]Transcription failed: {e}[/error]")
                with open("debug_run.log", "a") as f:
                    f.write(f"\n[ERROR] Transcription {consultation_id}: {str(e)}\n{error_trace}\n")
                consultation.status = ConsultationStatus.FAILED
                consultation.requires_manual_review = True
                session.add(consultation)
                session.commit()
                progress.update(main_task, description="[bold red]Task Failed", completed=4)
                raise e

async def process_soap_generation(consultation_id: UUID):
    """
    Step 2: Generate SOAP from existing Transcript
    """
    console.rule(f"[bold magenta]Step 2: Starting SOAP GENERATION {consultation_id}")
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console,
        transient=False
    ) as progress:
        
        soap_task = progress.add_task("[magenta]Preparing Context...", total=6)

        with Session(engine) as session:
            consultation = session.get(Consultation, consultation_id)
            if not consultation:
                console.print(f"[error]Consultation {consultation_id} not found.[/error]")
                return

            # Get Latest Audio File for Transcript
            progress.update(soap_task, description="[magenta]Fetching Transcript...", advance=1)
            audio_file = session.exec(select(AudioFile).where(AudioFile.consultation_id == consultation_id).order_by(AudioFile.uploaded_at.desc())).first()
            
            if not audio_file or not audio_file.transcription:
                console.print("[warning]No transcript found for SOAP generation.[/warning]")
                consultation.status = ConsultationStatus.FAILED
                consultation.requires_manual_review = True
                session.add(consultation)
                session.commit()
                return

            transcript_text = audio_file.transcription
            utterances = [] 

            # Patient Context
            progress.update(soap_task, description="[magenta]Loading Patient Profile...", advance=1)
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
                progress.update(soap_task, description="[bold yellow]Generating SOAP with Gemini...", advance=1)
                console.log("Analyzing transcript for medical entities...")
                
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

                progress.update(soap_task, description="[magenta]Updating Database Records...", advance=1)
                
                # Create OR Update SOAP Note Record
                existing_soap = session.exec(select(SOAPNote).where(SOAPNote.consultation_id == consultation.id)).first()
                
                if existing_soap:
                     # Update
                     existing_soap.soap_json = soap_data # Store raw JSON for full fidelity
                     existing_soap.risk_flags = {"flags": risk_flags}
                     existing_soap.generated_by_ai = True
                     session.add(existing_soap)
                     soap_note = existing_soap # For downstream use (Triage)
                     console.log("Updated existing SOAP note.")
                else:
                    # Create New
                    soap_note = SOAPNote(
                        consultation_id=consultation.id,
                        soap_json=soap_data, # Store raw JSON for full fidelity
                        risk_flags={"flags": risk_flags}, # Wrap in dict as risk_flags is JSON type
                        generated_by_ai=True
                    )
                    session.add(soap_note)
                    console.log("Created new SOAP note.")
                
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
                            console.log(f"[info]Auto-updated Patient DOB based on Age: {age_val}[/info]")
                    
                    # Update Gender if missing or "Unknown"
                    current_gender = (patient_profile.gender or "").lower()
                    if (not current_gender or current_gender == "unknown") and extracted_demo.get("gender"):
                        gender_val = extracted_demo["gender"]
                        # Normalize simple cases
                        if gender_val.lower() in ["male", "m"]: gender_val = "Male"
                        elif gender_val.lower() in ["female", "f"]: gender_val = "Female"
                        
                        patient_profile.gender = gender_val
                        updated_profile = True
                        console.log(f"[info]Auto-updated Patient Gender: {patient_profile.gender}[/info]")
                    
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
                progress.update(soap_task, description="[magenta]Running Triage & Safety Checks...", advance=1)
                
                if patient_profile:
                    urgency, category = TriageService.calculate_urgency(soap_note, patient_profile)
                    consultation.urgency_score = urgency
                    consultation.triage_category = category
                    console.log(f"Triage Result: [bold]{category}[/bold] (Score: {urgency})")
                
                # 5b. Safety Checks
                if patient_profile:
                    warnings = SafetyService.check_drug_interactions(soap_note, patient_profile)
                    consultation.safety_warnings = warnings
                    if warnings:
                        console.log(f"[warning]Safety Warnings Found: {len(warnings)}[/warning]")
    
                # 6. Update Final Status
                # IMPORTANT: We do NOT mark as COMPLETED here. 
                # The doctor must review and sign off. We keep it IN_PROGRESS.
                consultation.status = ConsultationStatus.IN_PROGRESS
                # Reset manual review flag if it was set by previous error
                consultation.requires_manual_review = False
                
                session.add(consultation)
                session.commit()
                
                progress.update(soap_task, description="[bold green]SOAP Generation Complete!", completed=6)
                console.print(f"[success]✓ Processing successfully completed for {consultation_id}[/success]")
                
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                console.print(f"[error]Processing failed: {e}[/error]")
                
                # Log to file for agent visibility
                with open("debug_run.log", "a") as f:
                    f.write(f"\n[ERROR] {consultation_id}: {str(e)}\n{error_trace}\n")
    
                # Set status to FAILED so we can track errors in DB
                consultation.status = ConsultationStatus.FAILED
                consultation.requires_manual_review = True # Flag for Manual Intervention
                
                # Log General Failure if not logged by LLM block
                session.add(consultation)
                session.commit()
                progress.update(soap_task, description="[bold red]Task Failed", completed=6)

