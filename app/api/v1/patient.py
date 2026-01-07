"""
Patient Router - Endpoints for PATIENT role
Provides patient-specific data including available doctors for booking
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any

from app.core.db import get_session
from app.models.base import User, UserRole, DoctorProfile, DoctorStatus
from app.api.deps import get_current_user, RoleChecker

router = APIRouter()

@router.get("/doctors", response_model=List[Dict[str, Any]])
def get_available_doctors_for_patient(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.PATIENT]))
):
    """
    Get available doctors for patient booking.
    
    STRICT RULES:
    - Returns ONLY doctors with status = AVAILABLE
    - Excludes: ON_LEAVE, DEACTIVATED doctors
    - Never exposes status to patients (they don't need to know)
    - Protected for PATIENT role only
    """
    query = (
        select(User, DoctorProfile)
        .join(DoctorProfile, User.id == DoctorProfile.user_id)
        .where(User.role == UserRole.DOCTOR)
        .where(DoctorProfile.status == DoctorStatus.AVAILABLE)
    )
    results = session.exec(query).all()
    
    doctors = []
    for user, profile in results:
        doctors.append({
            "id": str(user.id),
            "name": f"Dr. {profile.first_name} {profile.last_name}",
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "specialization": profile.specialization or "General Practice",
            "clinic_address": profile.clinic_address or "",
            "bio": profile.bio or "",
            "image": f"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"
        })
    
    return doctors

@router.get("/doctors/{doctor_id}", response_model=Dict[str, Any])
def get_doctor_details_for_patient(
    doctor_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.PATIENT]))
):
    """
    Get single doctor details for patient booking.
    Only returns if doctor is AVAILABLE.
    """
    from uuid import UUID
    
    try:
        doc_uuid = UUID(doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")
    
    query = (
        select(User, DoctorProfile)
        .join(DoctorProfile, User.id == DoctorProfile.user_id)
        .where(User.id == doc_uuid)
        .where(User.role == UserRole.DOCTOR)
        .where(DoctorProfile.status == DoctorStatus.AVAILABLE)
    )
    result = session.exec(query).first()
    
    if not result:
        raise HTTPException(
            status_code=404, 
            detail="Doctor not found or currently unavailable"
        )
    
    user, profile = result
    return {
        "id": str(user.id),
        "name": f"Dr. {profile.first_name} {profile.last_name}",
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "specialization": profile.specialization or "General Practice",
        "clinic_address": profile.clinic_address or "",
        "bio": profile.bio or "",
        "consultation_fee": profile.consultation_fee,
        "years_of_experience": profile.years_of_experience,
        "image": f"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"
    }
