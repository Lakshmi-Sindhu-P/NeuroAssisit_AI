from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import Consultation, ConsultationStatus, Appointment, User, UserRole, AudioFile, SOAPNote, AudioUploaderType, AudioFileType, PatientProfile, DoctorProfile, Bill, PaymentStatus
from app.api.deps import get_current_user, RoleChecker
from app.services.consultation_processor import process_transcription_only, process_soap_generation
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from uuid import UUID, uuid4
import os
import shutil

router = APIRouter()

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

class ConsultationCreate(BaseModel):
    appointment_id: UUID
    patient_id: Optional[UUID] = None # Optional if doctor creates it and patient is inferred from appointment
    notes: Optional[str] = None

class ConsultationRead(BaseModel):
    id: UUID
    status: ConsultationStatus
    patient_id: UUID
    doctor_id: UUID
    appointment_id: UUID
    appointment: Optional[Any] = None
    audio_files: List[Any] = []
    medical_documents: List[Any] = []
    soap_note: Optional[Any] = None
    safety_warnings: Optional[List[dict]] = None
    risk_flags: Optional[List[str]] = None
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    urgency_score: Optional[int] = None
    triage_category: Optional[str] = None
    created_at: Optional[Any] = None
    end_time: Optional[Any] = None
    patient_profile: Optional[Any] = None # Explicitly added

    model_config = {"from_attributes": True}

@router.post("/", response_model=Consultation)
def create_consultation(
    consultation_in: ConsultationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.FRONT_DESK]))
):
    # Verify appointment
    appointment = session.get(Appointment, consultation_in.appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if consultation already exists for this appointment
    existing = session.exec(select(Consultation).where(Consultation.appointment_id == consultation_in.appointment_id)).first()
    if existing:
        return existing

    # Create Consultation
    new_consultation = Consultation(
        appointment_id=consultation_in.appointment_id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        status=ConsultationStatus.SCHEDULED,
        notes=consultation_in.notes
    )
    session.add(new_consultation)
    session.commit()
    session.refresh(new_consultation)
    return new_consultation

from sqlalchemy.orm import selectinload

@router.get("/{id}", response_model=ConsultationRead) # Returning DB model direct for now, includes relationships
def get_consultation(
    id: UUID,
    reset_temp: bool = False, # NEW Param: If True, clears unverified transcripts (for page refresh)
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Handle Reset Logic BEFORE loading
    if reset_temp:
        print(f"DEBUG_RESET: Reset triggered for consultation {id}")
        # Find unverified audio files for this consultation
        unverified_audio = session.exec(
            select(AudioFile)
            .where(AudioFile.consultation_id == id)
            .where(AudioFile.is_transcript_verified == False)
            .where(AudioFile.transcription != None)
        ).all()
        
        if unverified_audio:
            print(f"DEBUG_RESET: Deleting {len(unverified_audio)} unverified transcripts")
            for audio in unverified_audio:
                audio.transcription = None # WIPE content
                session.add(audio)
            session.commit()
        else:
             print("DEBUG_RESET: No unverified transcripts found to delete.")

    consultation = session.exec(
        select(Consultation)
        .where(Consultation.id == id)
        .options(
            selectinload(Consultation.audio_files), 
            selectinload(Consultation.soap_note),
            selectinload(Consultation.documents),
            selectinload(Consultation.appointment).selectinload(Appointment.patient).selectinload(User.patient_profile)
        )
    ).first()
    
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Access Control
    if current_user.role == UserRole.PATIENT and consultation.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == UserRole.DOCTOR and consultation.doctor_id != current_user.id:
         # Doctors can view their own patients' consultations
         pass 

    # Manually construct response to handle both relationships and custom fields safe from ORM strictness
    consultation_dict = consultation.dict()
    consultation_dict['audio_files'] = consultation.audio_files
    consultation_dict['soap_note'] = consultation.soap_note
    consultation_dict['medical_documents'] = consultation.documents
    consultation_dict['appointment'] = consultation.appointment
    
    # Add patient_profile if available
    if consultation.appointment and consultation.appointment.patient and consultation.appointment.patient.patient_profile:
         consultation_dict['patient_profile'] = consultation.appointment.patient.patient_profile

    return ConsultationRead(**consultation_dict)

@router.get("/me", response_model=List[ConsultationRead])
def get_my_consultations(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.PATIENT, UserRole.MASTER_ADMIN]))
):
    if current_user.role == UserRole.PATIENT:
        statement = select(Consultation).where(Consultation.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        statement = select(Consultation).where(Consultation.doctor_id == current_user.id)
    else:
        statement = select(Consultation)
        
    results = session.exec(
        statement.options(
            selectinload(Consultation.audio_files), 
            selectinload(Consultation.soap_note),
            selectinload(Consultation.appointment).selectinload(Appointment.patient).selectinload(User.patient_profile)
        ).order_by(Consultation.created_at.desc())
    ).all()
    return results

@router.get("/patient/{patient_id}", response_model=List[ConsultationRead])
def get_patient_consultations(
    patient_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.FRONT_DESK, UserRole.MASTER_ADMIN]))
):
    results = session.exec(
        select(Consultation)
        .where(Consultation.patient_id == patient_id)
        .options(
             selectinload(Consultation.soap_note),
             selectinload(Consultation.appointment),
             selectinload(Consultation.audio_files),
             selectinload(Consultation.documents)
        ).order_by(Consultation.created_at.desc())
    ).all()
    return results

@router.post("/{id}/upload")
async def upload_audio(
    id: UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source: Optional[str] = Form(None), # PRE_VISIT or CONSULTATION
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.PATIENT, UserRole.FRONT_DESK]))
):
    try:
        print(f"DEBUG_UPLOAD: Request for Consultation {id}, File: {file.filename}, Source: {source}", flush=True)
        consultation = session.get(Consultation, id)
        if not consultation:
            print(f"Consultation {id} not found")
            raise HTTPException(status_code=404, detail="Consultation not found")
            
        # Enforce Front Desk Restriction: Upload ONLY ONCE
        if current_user.role == UserRole.FRONT_DESK:
            existing_audio = session.exec(select(AudioFile).where(AudioFile.consultation_id == id)).first()
            if existing_audio:
                raise HTTPException(status_code=403, detail="Front Desk can only upload audio once during check-in.")
            
        # Validation
        # 1. Size Limit (50MB)
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > 50 * 1024 * 1024: # 50 MB
             print(f"File too large: {file_size} bytes")
             raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")

        # 2. Format
        if not file.filename.lower().endswith(('.wav', '.mp3', '.m4a', '.aac', '.webm')): # Case insensitive check
            print(f"Invalid file format: {file.filename}")
            raise HTTPException(status_code=400, detail="Invalid file format")

        # Clear existing SOAP note if exists (for Redo scenarios)
        # This ensures frontend polling puts UI back into "processing" state
        existing_soap = session.exec(select(SOAPNote).where(SOAPNote.consultation_id == id)).first()
        if existing_soap:
            session.delete(existing_soap)
        
        # Clean Slate: Delete OLD Audio Files for this consultation to avoid accumulation
        existing_audio_files = session.exec(select(AudioFile).where(AudioFile.consultation_id == id)).all()
        for audio in existing_audio_files:
            session.delete(audio) # Delete file record (Physical file deletion could be added here if needed)

        # Also clear the "flat" fields on the consultation object to prevent old data from showing
        # while the new analysis is running (or if it fails).
        consultation.notes = ""
        consultation.diagnosis = ""
        consultation.prescription = ""
        session.add(consultation)
        session.commit()
        # Refresh consultation to ensure relation is updated in session if needed
        session.refresh(consultation)

        # --- NAMING CONVENTION LOGIC ---
        # Fetch Profiles for Naming
        # Naming: PAT(3)+PAT(3)_DOC(3)+DOC(3)_DD-MM-YYYY_HH-MM
        pat_name = "UNKUNK"
        doc_name = "UNKUNK"
        
        try:
            # Patient
            pat_profile = session.exec(select(PatientProfile).where(PatientProfile.user_id == consultation.patient_id)).first()
            if pat_profile:
                 p_first = (pat_profile.first_name or "XXX")[:3].upper()
                 p_last = (pat_profile.last_name or "XXX")[:3].upper()
                 pat_name = f"{p_first}{p_last}"
            
            # Doctor
            doc_profile = session.exec(select(DoctorProfile).where(DoctorProfile.user_id == consultation.doctor_id)).first()
            if doc_profile:
                 d_first = (doc_profile.first_name or "XXX")[:3].upper()
                 d_last = (doc_profile.last_name or "XXX")[:3].upper()
                 doc_name = f"{d_first}{d_last}"
                 
        except Exception as e:
            print(f"Error fetching profiles for naming: {e}")

        from datetime import datetime
        now = datetime.now()
        timestamp_str = now.strftime("%d-%m-%Y_%H-%M")
        
        file_ext = os.path.splitext(file.filename)[1]
        # Unique ID still needed to prevent collision if multiple uploads in same minute, prepending
        file_id = uuid4()
        
        # Final Name: PATLAA_DOCSMI_06-01-2025_10-30_UUID.webm
        safe_filename = f"{pat_name}_{doc_name}_{timestamp_str}_{str(file_id)[:8]}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Determine File Type
        try:
            if not source:
                 file_type = AudioFileType.PRE_VISIT
            else:
                 file_type = AudioFileType(source)
        except ValueError:
            file_type = AudioFileType.PRE_VISIT

        # --- AUDIO CONVERSION (WebM -> MP3) ---
        # Gemini often rejects raw browser WebM. Convert to MP3 for compatibility.
        original_path = file_path
        
        # Check if conversion is needed (convert everything not MP3/WAV just to be safe, or specifically WebM)
        if file_ext.lower() not in ['.mp3', '.wav']:
            try:
                print(f"Converting {file.filename} to MP3...")
                mp3_filename = os.path.splitext(safe_filename)[0] + ".mp3"
                mp3_path = os.path.join(UPLOAD_DIR, mp3_filename)
                
                import subprocess
                # ffmpeg -i input.webm -vn -acodec libmp3lame -q:a 2 output.mp3
                # -vn: disable video, -y: overwrite
                cmd = [
                    "ffmpeg", "-y", 
                    "-i", original_path, 
                    "-vn", 
                    "-acodec", "libmp3lame", 
                    "-q:a", "2", 
                    mp3_path
                ]
                
                # Run conversion
                result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
                if result.returncode == 0:
                    print(f"Conversion successful: {mp3_filename}")
                    # Update references to use the new MP3
                    safe_filename = mp3_filename
                    file_path = mp3_path
                    # Optional: Remove original to save space? Keep for now for debugging.
                else:
                    print(f"FFmpeg conversion failed: {result.stderr.decode()}")
                    # Fallback to original file if conversion fails
                    
            except Exception as e:
                print(f"Conversion exception: {e}")
                # Fallback to original file

        # Create AudioFile Record
        # CRITICAL: Map FRONT_DESK to DOCTOR uploader type to avoid DB Enum error
        if current_user.role == UserRole.DOCTOR or current_user.role == UserRole.FRONT_DESK:
            uploader_type = AudioUploaderType.DOCTOR
        else:
            uploader_type = AudioUploaderType.PATIENT

        audio_file = AudioFile(
            id=file_id,
            consultation_id=id,
            uploaded_by=uploader_type,
            file_type=file_type, # Correctly mapping to DB column file_type
            file_name=safe_filename, # Store the convenient name
            file_url=file_path,
            is_transcript_verified=False # Explicitly set Unverified by default
        )
        session.add(audio_file)
        
        # Update Status
        consultation.status = ConsultationStatus.IN_PROGRESS
        session.add(consultation)
        session.commit()
        
        # Trigger Background Task - TRANSCRIPTION ONLY
        background_tasks.add_task(process_transcription_only, consultation.id, audio_file.id)

        print(f"Upload successful. Processing background task for {safe_filename}")
        return {"message": "Audio uploaded, transcription started", "audio_id": file_id}

    except Exception as e:
        print(f"UPLOAD FAILED: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/{id}/reprocess_audio")
async def reprocess_audio(
    id: UUID,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.MASTER_ADMIN]))
):
    """
    Manually triggers transcription for an existing audio file.
    Useful if transcription failed or was skipped.
    """
    consultation = session.get(Consultation, id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Find valid audio file
    audio_file = session.exec(
        select(AudioFile)
        .where(AudioFile.consultation_id == id)
        .where(AudioFile.file_type == AudioFileType.CONSULTATION)
    ).first()

    if not audio_file:
         raise HTTPException(status_code=404, detail="No consultation audio found to process")

    print(f"Reprocessing audio for consultation {id}, file {audio_file.file_name}")

    # Mark as unverified on reprocess (it's a new attempt)
    audio_file.is_transcript_verified = False
    session.add(audio_file)

    # Update status to show something is happening
    consultation.status = ConsultationStatus.IN_PROGRESS
    session.add(consultation)
    session.commit()

    # Trigger Background Task
    background_tasks.add_task(process_transcription_only, consultation.id, audio_file.id)

    return {"message": "Reprocessing started", "audio_id": audio_file.id}

@router.post("/{id}/generate_soap")
async def generate_soap(
    id: UUID,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.MASTER_ADMIN]))
):
    """
    Triggers SOAP note generation from existing transcript.
    """
    consultation = session.get(Consultation, id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
        
    print(f"Manual SOAP generation triggered for {id}")
    
    # Trigger Background Processing - STEP 2 (SOAP Gen)
    background_tasks.add_task(process_soap_generation, id)
    
    return {"status": "SOAP generation started"}

class ConsultationUpdate(BaseModel):
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    transcript: Optional[str] = None

@router.get("/{id}/intake_summary")
async def get_intake_summary(
    id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.MASTER_ADMIN]))
):
    """
    Returns a clinical summary of any pre-visit (Front Desk/Patient) recordings.
    """
    consultation = session.get(Consultation, id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
        
    pre_visit_audio = session.exec(
        select(AudioFile)
        .where(AudioFile.consultation_id == id)
        .where(AudioFile.file_type == AudioFileType.PRE_VISIT)
    ).all()
    
    if not pre_visit_audio:
        return {"summary": "No pre-visit data available.", "full_transcript": ""}
        
    transcripts = [a.transcription for a in pre_visit_audio if a.transcription]
    full_transcript = "\n\n".join(transcripts)
    
    if not full_transcript:
        return {"summary": "Pre-visit recording found but not yet transcribed.", "full_transcript": ""}
        
    # Generate Summary via Gemini
    from app.services.llm_service import GeminiService
    try:
        summary = await GeminiService.generate_intake_summary(full_transcript)
        return {
            "summary": summary,
            "full_transcript": full_transcript
        }
    except Exception as e:
        print(f"Intake summary generation failed: {e}")
        return {
            "summary": "Clinical summary unavailable.",
            "full_transcript": full_transcript
        }

@router.patch("/{id}", response_model=Consultation)
def update_consultation(
    id: UUID,
    update_data: ConsultationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.FRONT_DESK]))
):
    consultation = session.get(Consultation, id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
        
    # Access Control (Doctors only edit their own or valid patients)
    if current_user.role == UserRole.DOCTOR and consultation.doctor_id != current_user.id:
         # Simplified check; in real app might allow covering doctors
         raise HTTPException(status_code=403, detail="Not authorized to edit this consultation")

    if update_data.notes is not None:
        consultation.notes = update_data.notes
    if update_data.diagnosis is not None:
        consultation.diagnosis = update_data.diagnosis
    if update_data.prescription is not None:
        consultation.prescription = update_data.prescription
        
    # Handle Transcript Update
    if update_data.transcript is not None:
        # Find the consultation audio file
        audio_file = session.exec(
            select(AudioFile)
            .where(AudioFile.consultation_id == id)
            .where(AudioFile.file_type == AudioFileType.CONSULTATION)
        ).first()
        
        if audio_file:
            audio_file.transcription = update_data.transcript
            # MARK AS VERIFIED since user is manually saving/updating it
            audio_file.is_transcript_verified = True 
            session.add(audio_file)
        
    session.add(consultation)
    session.commit()
    session.refresh(consultation)
    return consultation

    session.add(consultation)
    session.commit()
    session.refresh(consultation)
    return consultation
@router.patch("/{id}/finish", response_model=Consultation)
def finish_consultation(
    id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.FRONT_DESK]))
):
    consultation = session.get(Consultation, id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
        
    # Access Control
    if current_user.role == UserRole.DOCTOR and consultation.doctor_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized")

    consultation.status = ConsultationStatus.COMPLETED
    consultation.end_time = datetime.utcnow()
    
    # --- AUTO-UPDATE DEMOGRAPHICS ON FINALIZE ---
    # Attempt to extract age/gender from final notes if still missing
    patient = session.get(User, consultation.patient_id)
    if patient and patient.patient_profile:
        profile = patient.patient_profile
        updated = False
        
        # Helper: Extract Age ("45 yrs", "45 years", "age 45")
        if not profile.date_of_birth:
            import re
            from datetime import datetime, timedelta
            text_sources = [consultation.diagnosis or "", consultation.notes or ""]
            if consultation.soap_note and consultation.soap_note.soap_json:
                text_sources.append(str(consultation.soap_note.soap_json))
                
            combined_text = " ".join(text_sources).lower()
            
            # Regex for "45 years", "45 yo", "age: 45", "male 45", "84-year-old"
            age_patterns = [
                r"(\d{1,3})[\s-]?(?:years?|yrs?|yo|y/o)(?:[\s-]?old)?",
                r"age[:\s]+(\d{1,3})\b", 
                r"(?:male|female)\s+(\d{1,3})\b"
            ]
            
            for pattern in age_patterns:
                match = re.search(pattern, combined_text)
                if match:
                    try:
                        age_val = int(match.group(1))
                        # Sanity check
                        if 0 < age_val < 120:
                            profile.date_of_birth = datetime.utcnow() - timedelta(days=age_val * 365)
                            updated = True
                            print(f"Finalize: Extracted Age {age_val}")
                            break
                    except:
                        continue

        # Helper: Extract Gender
        current_gender = (profile.gender or "").lower()
        if not current_gender or current_gender == "unknown":
            text_sources = [consultation.diagnosis or "", consultation.notes or ""]
            if consultation.soap_note and consultation.soap_note.soap_json:
                text_sources.append(str(consultation.soap_note.soap_json))
            combined_text = " ".join(text_sources).lower()
            
            if re.search(r"\b(male|man|boy|gentleman)\b", combined_text):
                 profile.gender = "Male"
                 updated = True
                 print("Finalize: Extracted Gender Male")
            elif re.search(r"\b(female|woman|girl|lady)\b", combined_text):
                 profile.gender = "Female"
                 updated = True
                 print("Finalize: Extracted Gender Female")

        if updated:
            session.add(profile)

    # --- AUTO-GENERATE BILL (US-FD-006) ---
    existing_bill = session.exec(select(Bill).where(Bill.consultation_id == id)).first()
    if not existing_bill:
        amount = 50.0 # Default
        # Fetch Doctor Fee
        doctor_user = session.get(User, consultation.doctor_id)
        if doctor_user and doctor_user.doctor_profile and doctor_user.doctor_profile.consultation_fee:
            amount = doctor_user.doctor_profile.consultation_fee
            
        bill = Bill(
            consultation_id=id,
            amount=amount,
            status=PaymentStatus.PENDING
        )
        session.add(bill)
        print(f"Auto-generated Bill for Consultation {id}: ${amount}")

    session.add(consultation)
    session.commit()
    session.refresh(consultation)
    return consultation
from app.models.base import DocumentType, MedicalDocument

@router.post("/{id}/upload-document")
async def upload_document(
    id: UUID,
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.FRONT_DESK]))
):
    consultation = session.get(Consultation, id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
        
    # Validation (Basic)
    if not file.filename:
         raise HTTPException(status_code=400, detail="Invalid file")
         
    # Save File
    file_id = uuid4()
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"doc_{file_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create Record
    doc = MedicalDocument(
        id=file_id,
        consultation_id=id,
        document_type=document_type,
        file_name=file.filename,
        file_url=file_path
    )
    session.add(doc)
    session.commit()
    
    return {"message": "Document uploaded", "document_id": file_id}

@router.post("/{id}/analyze-document")
async def analyze_document(
    id: UUID,
    document_id: str = Form(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.FRONT_DESK]))
):
    # Retrieve Document record to get path
    # Note: document_id passed from frontend is the UUID string
    try:
        doc_uuid = UUID(document_id)
        doc = session.get(MedicalDocument, doc_uuid)
    except:
        raise HTTPException(status_code=400, detail="Invalid Document ID")

    if not doc or doc.consultation_id != id:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(doc.file_url):
         raise HTTPException(status_code=404, detail="File not found on server")

    # Call Gemini Vision
    try:
        from app.services.llm_service import GeminiService
        analysis_result = await GeminiService.generate_prescription_digitization(doc.file_url)
        return analysis_result
    except Exception as e:
        print(f"OCR Error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
class DocumentGenerationRequest(BaseModel):
    document_type: str  # "medical_certificate", "referral_letter", "clinical_summary"

@router.post("/{id}/generate-document", response_model=Dict[str, str])
async def generate_document(
    id: UUID,
    payload: DocumentGenerationRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.FRONT_DESK]))
):
    consultation = session.get(Consultation, id)
    if not consultation:
         raise HTTPException(status_code=404, detail="Consultation not found")

    if not consultation.soap_note:
         raise HTTPException(status_code=400, detail="SOAP Note must be generated first")
         
    # Fetch Patient
    patient = session.get(User, consultation.patient_id)
    if not patient:
         raise HTTPException(status_code=404, detail="Patient not found")
         
    # Build Context
    patient_context = {
        "first_name": "Unknown",
        "last_name": "",
        "age": "N/A"
    }
    if patient.patient_profile:
        patient_context["first_name"] = patient.patient_profile.first_name
        patient_context["last_name"] = patient.patient_profile.last_name
        # Calc age if dob exists, else N/A
    
    # Safe extraction from JSON
    soap_data = consultation.soap_note.soap_json or {}
    soap_dict = {
        "subjective": soap_data.get("subjective", ""),
        "objective": soap_data.get("objective", ""),
        "assessment": soap_data.get("assessment", ""),
        "plan": soap_data.get("plan", "")
    }

    try:
        from app.services.llm_service import GeminiService
        generated_text = await GeminiService.generate_clinical_document(
            payload.document_type,
            soap_dict,
            patient_context
        )
        return {"content": generated_text}
    except Exception as e:
        print(f"Doc Gen Error: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
