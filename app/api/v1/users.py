from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import User, PatientProfile, UserRole
from app.api.deps import get_current_user, RoleChecker
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

router = APIRouter()

class PatientProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    age: Optional[int] = None
    gender_identity: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    current_medications: Optional[str] = None
    medical_history: Optional[str] = None

@router.put("/me/profile", response_model=PatientProfile)
def update_my_profile(
    profile_in: PatientProfileUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Update the current logged-in user's profile.
    Currently supports PATIENT role.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=400, detail="Profile update currently only supported for Patients")
        
    # User relationship lazy loading might need explicit query if not loaded
    # But usually we can query the profile directly by user_id
    profile = session.exec(select(PatientProfile).where(PatientProfile.user_id == current_user.id)).first()
    
    if not profile:
        # Should have been created at signup, but if missing, create one?
        # Better to error out or create. Let's create if missing for robustness.
        profile = PatientProfile(user_id=current_user.id, first_name="", last_name="")
        session.add(profile)
    
    profile_data = profile_in.dict(exclude_unset=True)
    for key, value in profile_data.items():
        setattr(profile, key, value)
        
    profile.updated_at = datetime.utcnow()
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile

@router.get("/me/profile", response_model=dict)
def get_my_profile(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile (Patient or Doctor).
    Returns dict to accommodate different profile shapes.
    """
    if current_user.role == UserRole.PATIENT:
        profile = session.exec(select(PatientProfile).where(PatientProfile.user_id == current_user.id)).first()
        if not profile:
            # Return basic info if profile missing
            return {"first_name": "Patient", "last_name": "", "user_id": str(current_user.id)}
        return profile.dict()
        
    elif current_user.role == UserRole.DOCTOR:
        from app.models.base import DoctorProfile
        profile = session.exec(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)).first()
        if not profile:
            return {"first_name": "Doctor", "last_name": "", "user_id": str(current_user.id)}
        return profile.dict()
        
    elif current_user.role == UserRole.FRONT_DESK:
        # Front desk might not have a dedicated profile table yet
        return {"first_name": "Front", "last_name": "Desk", "user_id": str(current_user.id)}
    
    return {"first_name": "User", "last_name": "", "user_id": str(current_user.id)}

@router.get("/doctors", response_model=List[dict])
def list_doctors(
    session: Session = Depends(get_session)
):
    """
    Returns a list of all doctors with their profiles.
    """
    from app.models.base import DoctorProfile
    
    query = (
        select(User, DoctorProfile)
        .join(DoctorProfile, User.id == DoctorProfile.user_id)
        .where(User.role == UserRole.DOCTOR)
    )
    results = session.exec(query).all()
    
    doctors = []
    for user, profile in results:
        doctors.append({
            "id": str(user.id),
            "email": user.email,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "specialization": profile.specialization,
            "clinic_address": profile.clinic_address,
            "image": f"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face" # Placeholder
        })
    return doctors

@router.get("/patients/{patient_id}", response_model=PatientProfile)
def get_patient_profile(
    patient_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.FRONT_DESK]))
):
    """
    Get a specific patient's profile.
    Accessible by Doctors and Front Desk.
    """
    # Verify patient exists
    patient = session.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="Patient not found")

    profile = session.exec(select(PatientProfile).where(PatientProfile.user_id == patient_id)).first()
    
    if not profile:
        # Return empty profile wrapper if not set
        return PatientProfile(user_id=patient_id, first_name="Unknown", last_name="Patient")
        
    return profile

@router.get("/patients", response_model=List[dict])
def list_my_patients(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR]))
):
    """
    Returns list of patients appearing in the doctor's consultation history.
    """
    from app.models.base import Consultation
    
    # query distinct patients involved in consultations with this doctor
    # We want profile details.
    
    query = (
        select(PatientProfile)
        .join(Consultation, Consultation.patient_id == PatientProfile.user_id)
        .where(Consultation.doctor_id == current_user.id)
        .distinct()
    )
    
    profiles = session.exec(query).all()
    
    results = []
    for p in profiles:
        # Get latest consultation date
        last_visit = session.exec(
            select(Consultation.created_at)
            .where(Consultation.patient_id == p.user_id)
            .where(Consultation.doctor_id == current_user.id)
            .order_by(Consultation.created_at.desc())
        ).first()
        
        results.append({
            "id": str(p.user_id), # Return User ID as the identifier
            "first_name": p.first_name,
            "last_name": p.last_name,
            "gender": p.gender,
            "date_of_birth": p.date_of_birth,
            "last_visit": last_visit
        })
        
    return results
