from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import Appointment, User, UserRole, AppointmentStatus, Consultation, ConsultationStatus
from app.api.deps import get_current_user
from app.schemas.appointment import AppointmentCreate
from datetime import datetime, timezone
from uuid import UUID

router = APIRouter()

@router.post("/", status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Validate permissions
    if current_user.role == UserRole.PATIENT:
        if payload.patient_id != current_user.id:
             raise HTTPException(status_code=403, detail="Patients can only book for themselves")
    elif current_user.role not in [UserRole.DOCTOR, UserRole.FRONT_DESK]:
         raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Validate scheduled time is in the future
    # Ensure both are timezone-aware or both are naive for comparison
    now = datetime.now(timezone.utc)
    scheduled = payload.scheduled_at
    if scheduled.tzinfo is None:
        scheduled = scheduled.replace(tzinfo=timezone.utc)
        
    if scheduled <= now:
        raise HTTPException(status_code=400, detail="Cannot book appointment in the past")
    
    # Merge symptoms from reason or notes
    symptoms = payload.reason or payload.notes
    if not symptoms:
        raise HTTPException(status_code=400, detail="Symptoms required")
    
    # Validate doctor exists and is a doctor
    doctor = session.get(User, payload.doctor_id)
    if not doctor or doctor.role != UserRole.DOCTOR:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Create appointment
    appointment = Appointment(
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        doctor_name=payload.doctor_name,
        scheduled_at=payload.scheduled_at,
        reason=symptoms,
        status=AppointmentStatus.SCHEDULED
    )
    
    session.add(appointment)
    session.commit()
    session.refresh(appointment)
    
    # Create associated consultation automatically to sync with Doctor Queue
    from app.services.triage_service import TriageService
    triage_result = TriageService.evaluate_transcript(symptoms)
    
    consultation = Consultation(
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        status=ConsultationStatus.SCHEDULED,
        notes=symptoms,
        urgency_score=triage_result["risk_score"],
        triage_category=triage_result["triage_status"],
        triage_reason=triage_result["reason"],
        triage_source=triage_result.get("triage_source", "AI")
    )
    session.add(consultation)
    session.commit()
    session.refresh(consultation)
    
    return {
        "id": str(appointment.id),
        "consultation_id": str(consultation.id),
        "status": "confirmed",
        "scheduled_at": appointment.scheduled_at.isoformat(),
        "doctor_name": appointment.doctor_name,
        "triage_category": triage_result["triage_status"].value if hasattr(triage_result["triage_status"], 'value') else str(triage_result["triage_status"])
    }

@router.get("/me")
def get_my_appointments(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.PATIENT:
        statement = select(Appointment).where(Appointment.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        statement = select(Appointment).where(Appointment.doctor_id == current_user.id)
    else:
        statement = select(Appointment)
    return session.exec(statement).all()

@router.get("/{id}")
def get_appointment_by_id(
    id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single appointment by ID.
    Patients can only view their own appointments.
    Doctors can view appointments assigned to them.
    """
    appointment = session.get(Appointment, id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Authorization check
    if current_user.role == UserRole.PATIENT:
        if appointment.patient_id != current_user.id:
            raise HTTPException(status_code=404, detail="Appointment not found")
    elif current_user.role == UserRole.DOCTOR:
        if appointment.doctor_id != current_user.id:
            raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Return appointment with additional details
    return {
        "id": str(appointment.id),
        "doctor_id": str(appointment.doctor_id) if appointment.doctor_id else None,
        "doctor_name": appointment.doctor_name,
        "doctor_specialization": None,  # Can be enhanced with profile lookup
        "patient_id": str(appointment.patient_id),
        "scheduled_at": appointment.scheduled_at.isoformat(),
        "status": appointment.status.value if hasattr(appointment.status, 'value') else str(appointment.status),
        "reason": appointment.reason,
        "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
        "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
    }

@router.patch("/{id}/status")
def update_status(
    id: UUID,
    new_status: AppointmentStatus,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.DOCTOR, UserRole.FRONT_DESK]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    appointment = session.get(Appointment, id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment.status = new_status
    appointment.updated_at = datetime.now(timezone.utc)
    session.add(appointment)
    session.commit()
    return {"message": f"Status updated to {new_status}"}
