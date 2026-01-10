from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
from app.core.db import get_session
from app.models.base import User, PatientProfile, DoctorProfile, UserRole, DoctorStatus
from app.api.deps import RoleChecker

router = APIRouter()

@router.get("/patients", response_model=List[Dict[str, Any]])
def get_frontdesk_patients(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.FRONT_DESK]))
):
    """
    Get all patients for Front Desk selection.
    Only returns basic info for active patients.
    """
    query = (
        select(User, PatientProfile)
        .join(PatientProfile, User.id == PatientProfile.user_id)
        .where(User.role == UserRole.PATIENT)
        # Note: 'status' filtering logic as per requirement, assuming ACTIVE based on lack of status field in User model
        # If a status field existed on User, we would filter here.
    )
    results = session.exec(query).all()
    
    return [
        {
            "id": str(user.id),
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "email": user.email
        }
        for user, profile in results
    ]

@router.get("/doctors", response_model=List[Dict[str, Any]])
def get_frontdesk_doctors(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.FRONT_DESK]))
):
    """
    Get all available doctors for Front Desk assignment.
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
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "specialization": profile.specialization
        }
        for user, profile in results
    ]
