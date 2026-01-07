from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime
from app.core.db import get_session
from app.models.base import (
    Consultation, PatientProfile, User, UserRole, ConsultationStatus,
    Appointment, AppointmentStatus, DoctorProfile, DoctorStatus, TriageCategory
)
from app.api.deps import RoleChecker

router = APIRouter()


# ============ NAME NORMALIZATION UTILITY ============
def title_case(name: str | None) -> str:
    """
    Convert name to Title Case ("Max Black" format).
    - Trims extra spaces
    - Collapses multiple spaces
    - Capitalizes first letter of each word
    - Handles null/empty safely
    """
    if not name:
        return ""
    return " ".join(word.capitalize() for word in name.strip().split())
# ============ ACTIVE DOCTORS FOR FRONT DESK ============

@router.get("/doctors/active", response_model=List[Dict[str, Any]])
def get_active_doctors(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.FRONT_DESK, UserRole.DOCTOR]))
):
    """
    Get doctors with AVAILABLE status only.
    Used by Front Desk for doctor assignment dropdown.
    Does NOT include phone numbers (privacy).
    """
    query = (
        select(User, DoctorProfile)
        .join(DoctorProfile, User.id == DoctorProfile.user_id)
        .where(User.role == UserRole.DOCTOR)
        .where(DoctorProfile.status == DoctorStatus.AVAILABLE)
    )
    results = session.exec(query).all()
    
    return [
        {
            "id": str(user.id),
            "email": user.email,
            "first_name": title_case(profile.first_name),
            "last_name": title_case(profile.last_name),
            "specialization": profile.specialization,
            "name": f"Dr. {title_case(profile.first_name)} {title_case(profile.last_name)}"
        }
        for user, profile in results
    ]

@router.get("/triage_queue", response_model=List[Dict[str, Any]])
def get_triage_queue(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.FRONT_DESK, UserRole.DOCTOR]))
):
    """
    Returns the live triage queue for front desk use.
    Uses Appointments as source of truth.
    CRITICAL patients appear at TOP of queue.
    Includes patients who booked online OR checked in manually.
    Excludes COMPLETED, CANCELLED, NO_SHOW appointments.
    """
    # Query appointments with patient profiles
    active_statuses = [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.IN_PROGRESS
    ]
    
    statement = (
        select(Appointment, PatientProfile)
        .join(PatientProfile, Appointment.patient_id == PatientProfile.user_id)
        .where(Appointment.status.in_(active_statuses))
        .order_by(Appointment.scheduled_at.asc())
    )
    results = session.exec(statement).all()
    
    queue = []
    for appointment, profile in results:
        # Get triage info from consultation
        urgency_score = 20  # Default LOW
        triage_category = TriageCategory.LOW
        triage_reason = None
        
        if appointment.consultation:
            urgency_score = appointment.consultation.urgency_score or 20
            triage_category = appointment.consultation.triage_category or TriageCategory.LOW
            triage_reason = appointment.consultation.triage_reason
        
        # Calculate wait time (minutes since scheduled/check-in)
        wait_time = 0
        if appointment.scheduled_at:
            wait_time = int((datetime.utcnow() - appointment.scheduled_at).total_seconds() / 60)
            if wait_time < 0:
                wait_time = 0
        
        queue.append({
            "id": str(appointment.id),
            "appointment_id": str(appointment.id),
            "patient_id": str(appointment.patient_id),
            "name": f"{title_case(profile.first_name)} {title_case(profile.last_name)}",
            "triageScore": urgency_score,
            "triageCategory": triage_category.value if hasattr(triage_category, 'value') else str(triage_category),
            "triageReason": triage_reason,
            "status": appointment.status.value if hasattr(appointment.status, 'value') else str(appointment.status),
            "scheduledAt": appointment.scheduled_at.isoformat() if appointment.scheduled_at else None,
            "assignedDoctor": title_case(appointment.doctor_name) if appointment.doctor_name else None,
            "checkInTime": appointment.scheduled_at.isoformat() if appointment.scheduled_at else datetime.utcnow().isoformat(),
            "waitTime": wait_time
        })
    
    # Sort queue: CRITICAL first, then by wait time (descending)
    priority_order = {
        TriageCategory.CRITICAL.value: 0,
        TriageCategory.HIGH.value: 1,
        TriageCategory.MODERATE.value: 2,
        TriageCategory.LOW.value: 3,
        "CRITICAL": 0,
        "HIGH": 1,
        "MODERATE": 2,
        "LOW": 3,
    }
    
    queue.sort(key=lambda x: (
        priority_order.get(x["triageCategory"], 4),
        -x["waitTime"]  # Higher wait time = higher priority within same triage level
    ))
    
    return queue


# ============ PRIVACY-SAFE PATIENT SUMMARY FOR FRONT DESK ============

@router.get("/queue/{appointment_id}/summary", response_model=Dict[str, Any])
def get_queue_patient_summary(
    appointment_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.FRONT_DESK, UserRole.MASTER_ADMIN]))
):
    """
    Privacy-safe patient summary for Front Desk queue popup.
    
    RETURNS (SAFE DATA ONLY):
    - Patient: name, age, gender, phone
    - Appointment: id, date, time, status
    - Triage: category, source (NOT urgency_score)
    - Doctor: name, specialization
    
    DOES NOT RETURN (PRIVACY):
    - transcript / audio_file
    - notes / symptoms
    - diagnosis / SOAP
    - safety_warnings
    - urgency_score (numeric)
    """
    # Get appointment
    appointment = session.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get patient profile
    patient_profile = session.exec(
        select(PatientProfile).where(PatientProfile.user_id == appointment.patient_id)
    ).first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    # Calculate age from date_of_birth if available
    age = None
    if patient_profile.date_of_birth:
        today = datetime.utcnow()
        dob = patient_profile.date_of_birth
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    
    # Get triage info from consultation (category only, NOT score)
    triage_category = "LOW"
    triage_source = None
    if appointment.consultation:
        tc = appointment.consultation.triage_category
        triage_category = tc.value if hasattr(tc, 'value') else str(tc) if tc else "LOW"
        triage_source = appointment.consultation.triage_source
    
    # Get doctor info
    doctor_name = title_case(appointment.doctor_name) if appointment.doctor_name else None
    doctor_specialization = None
    if appointment.doctor_id:
        doctor_profile = session.exec(
            select(DoctorProfile).where(DoctorProfile.user_id == appointment.doctor_id)
        ).first()
        if doctor_profile:
            doctor_name = f"Dr. {title_case(doctor_profile.first_name)} {title_case(doctor_profile.last_name)}"
            doctor_specialization = doctor_profile.specialization
    
    return {
        "patient": {
            "name": f"{title_case(patient_profile.first_name)} {title_case(patient_profile.last_name)}",
            "age": age,
            "gender": patient_profile.gender,
            "phone": patient_profile.phone_number
        },
        "appointment": {
            "id": str(appointment.id),
            "scheduled_at": appointment.scheduled_at.isoformat() if appointment.scheduled_at else None,
            "status": appointment.status.value if hasattr(appointment.status, 'value') else str(appointment.status),
            "reason": appointment.reason[:50] if appointment.reason else None  # Truncated, safe
        },
        "triage": {
            "category": triage_category,
            "source": triage_source
        },
        "doctor": {
            "name": doctor_name,
            "specialization": doctor_specialization
        }
    }

@router.patch("/assign/{appointment_id}", response_model=Dict[str, Any])
def assign_doctor(
    appointment_id: UUID,
    payload: Dict[str, UUID],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.FRONT_DESK]))
):
    doctor_id = payload.get("doctor_id")
    if not doctor_id:
        raise HTTPException(status_code=422, detail="doctor_id is required")

    appointment = session.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    doctor = session.get(User, doctor_id)
    if not doctor or doctor.role != UserRole.DOCTOR:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Check doctor status - only AVAILABLE doctors can be assigned
    if doctor.doctor_profile:
        if doctor.doctor_profile.status != DoctorStatus.AVAILABLE:
            status_msg = doctor.doctor_profile.status.value if doctor.doctor_profile.status else "UNKNOWN"
            raise HTTPException(
                status_code=400, 
                detail=f"Doctor is {status_msg} and cannot be assigned. Only AVAILABLE doctors can be assigned."
            )
        
    appointment.doctor_id = doctor_id
    
    # Update doctor_name if doctor has a profile
    statement = select(User).where(User.id == doctor_id)
    # We already have doctor object, but let's be sure about the profile
    if doctor.doctor_profile:
        appointment.doctor_name = f"Dr. {title_case(doctor.doctor_profile.first_name)} {title_case(doctor.doctor_profile.last_name)}"
        
    session.add(appointment)
    session.commit()
    return {"message": "Patient assigned successfully", "doctor_name": appointment.doctor_name}

@router.post("/check-in", response_model=Dict[str, Any])
def bulk_check_in(
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    # Allow both ADMIN and FRONT_DESK roles
    current_user: User = Depends(RoleChecker([UserRole.FRONT_DESK]))
):
    try:
        patient_id = payload.get("patient_id")
        doctor_id = payload.get("doctor_id")
        notes = payload.get("notes", "")
        # Audio is uploaded separately after check-in, but frontend can indicate if recording exists
        audio_provided = payload.get("audio_provided", False)

        if not patient_id or not doctor_id:
            raise HTTPException(status_code=400, detail="patient_id and doctor_id are required")

        # NOTE: Symptom intake is OPTIONAL for front desk walk-in patients
        # Audio recording and text notes are not required for check-in

        # Validate patient exists
        patient = session.get(User, patient_id)
        if not patient or patient.role != UserRole.PATIENT:
            raise HTTPException(status_code=404, detail="Patient not found")

        # Validate doctor exists
        doctor = session.get(User, doctor_id)
        if not doctor or doctor.role != UserRole.DOCTOR:
            raise HTTPException(status_code=404, detail="Doctor not found")

        # Import AppointmentStatus for proper enum usage
        from app.models.base import AppointmentStatus
        
        # Create Appointment with proper enum
        appointment = Appointment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            scheduled_at=datetime.utcnow(),
            reason=notes[:100] if notes else "Walk-in",
            status=AppointmentStatus.CHECKED_IN  # Use proper enum
        )
        
        # Get doctor name
        if doctor.doctor_profile:
            appointment.doctor_name = f"Dr. {title_case(doctor.doctor_profile.first_name)} {title_case(doctor.doctor_profile.last_name)}"
            
        session.add(appointment)
        session.commit()
        session.refresh(appointment)
        
        # Create Consultation with proper enum
        consultation = Consultation(
            appointment_id=appointment.id,
            patient_id=patient_id,
            doctor_id=doctor_id,
            status=ConsultationStatus.IN_PROGRESS,  # Use proper enum
            notes=notes
        )
        session.add(consultation)
        session.commit()
        session.refresh(consultation)
        
        return {
            "message": "Patient checked in successfully",
            "appointment_id": str(appointment.id),
            "consultation_id": str(consultation.id)
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log and return proper error
        import traceback
        print(f"Check-in error: {e}")
        traceback.print_exc()
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Check-in failed: {str(e)}")
