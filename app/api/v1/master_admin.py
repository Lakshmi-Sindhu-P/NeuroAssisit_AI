"""
Master Admin Router - Endpoints for MASTER_ADMIN role only
Manages: Doctors, Front Desk, Patients (read-only), Clinics, Audit Logs
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
import json

from app.core.db import get_session
from app.core.security import get_password_hash
from app.models.base import (
    User, UserRole, PatientProfile, DoctorProfile, FrontDeskProfile, FrontDeskStatus,
    Clinic, AuditLog, DoctorStatus
)
from app.api.deps import RoleChecker

router = APIRouter()
# Helper to log audit actions - NON-BLOCKING
# Audit logging failure MUST NOT block core operations
def log_audit(
    session: Session,
    user_id: UUID,
    action: str,
    target_type: str = None,
    target_id: UUID = None,
    details: dict = None,
    ip_address: str = None
):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=json.dumps(details) if details else None,
            ip_address=ip_address
        )
        session.add(audit)
        session.commit()
    except Exception as e:
        # NEVER block core operations due to audit log failure
        logger.warning(f"Audit log failed (non-blocking): {e}")
        try:
            session.rollback()
        except:
            pass

# ============ DOCTOR MANAGEMENT ============

@router.get("/doctors", response_model=List[Dict[str, Any]])
def list_doctors(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """List all doctors with their profiles and status"""
    import logging
    logger = logging.getLogger(__name__)
    query = (
        select(User, DoctorProfile)
        .outerjoin(DoctorProfile, User.id == DoctorProfile.user_id)
        .where(User.role == UserRole.DOCTOR)
    )
    results = session.exec(query).all()
    
    doctors = []
    for user, profile in results:
        # Get status from profile, default to AVAILABLE if no profile
        status = profile.status.value if profile and profile.status else DoctorStatus.AVAILABLE.value
        
        doctors.append({
            "id": str(user.id),
            "email": user.email,
            "status": status,
            "first_name": profile.first_name if profile else None,
            "last_name": profile.last_name if profile else None,
            "specialization": profile.specialization if profile else None,
            "phone_number": profile.phone_number if profile else None,
            "years_of_experience": profile.years_of_experience if profile else 0,
            "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') else None
        })
        # Debug log to verify DB value
        logger.info(f"Doctor {user.id}: years_of_experience = {profile.years_of_experience if profile else 0}")
    return doctors

@router.post("/doctors", response_model=Dict[str, Any])
def create_doctor(
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """
    Create a new doctor account (MASTER_ADMIN only).
    - Returns 409 if email exists as DOCTOR
    - Returns 409 if email exists with different role
    - Uses atomic transaction with rollback on failure
    """
    import logging
    logger = logging.getLogger(__name__)
    
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    password = payload.get("password", "TempPassword123!")
    first_name = payload.get("first_name", "")
    last_name = payload.get("last_name", "")
    specialization = payload.get("specialization", "Neurologist")
    phone = payload.get("phone", "")
    
    # Validate years_of_experience (optional, 0-60)
    years_exp = payload.get("years_of_experience")
    if years_exp is not None:
        try:
            years_exp = int(years_exp)
            if years_exp < 0 or years_exp > 60:
                raise HTTPException(status_code=400, detail="Years of experience must be between 0 and 60")
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Years of experience must be a number")
    else:
        years_exp = 0
    
    try:
        # Check if email exists
        existing = session.exec(select(User).where(User.email == email)).first()
        
        if existing:
            if existing.role == UserRole.DOCTOR:
                logger.warning(f"Doctor creation failed: {email} already registered as DOCTOR")
                raise HTTPException(
                    status_code=409, 
                    detail="Doctor already exists with this email"
                )
            else:
                role_name = existing.role.value if existing.role else "unknown"
                logger.warning(f"Doctor creation failed: {email} already registered as {role_name}")
                raise HTTPException(
                    status_code=409, 
                    detail=f"Email already registered with role: {role_name}"
                )
        
        # Create user with DOCTOR role (atomic transaction)
        new_user = User(
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.DOCTOR
        )
        session.add(new_user)
        session.flush()
        session.refresh(new_user)
        
        # Create doctor profile
        from uuid import uuid4
        profile = DoctorProfile(
            user_id=new_user.id,
            first_name=first_name,
            last_name=last_name,
            specialization=specialization,
            phone_number=phone,
            license_number=f"DOC-{str(uuid4())[:8].upper()}",
            years_of_experience=years_exp,
            qualification="MBBS"
        )
        session.add(profile)
        session.commit()
        
        logger.info(f"Doctor created successfully: {email}")
        
        # Log audit (in separate transaction)
        try:
            log_audit(
                session, current_user.id, "CREATE_DOCTOR",
                target_type="DOCTOR", target_id=new_user.id,
                details={"email": email, "name": f"{first_name} {last_name}"}
            )
        except Exception as audit_error:
            logger.warning(f"Audit log failed (non-critical): {audit_error}")
        
        return {
            "message": "Doctor created successfully", 
            "id": str(new_user.id),
            "email": email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Doctor creation failed: {e}")
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create doctor: {str(e)}")

@router.patch("/doctors/{doctor_id}", response_model=Dict[str, Any])
def update_doctor(
    doctor_id: UUID,
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Update or deactivate a doctor"""
    user = session.get(User, doctor_id)
    if not user or user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Update is_active if provided
    if "is_active" in payload:
        if hasattr(user, 'is_active'):
            user.is_active = payload["is_active"]
    
    # Update profile if exists
    profile = session.exec(
        select(DoctorProfile).where(DoctorProfile.user_id == doctor_id)
    ).first()
    
    if profile:
        if "first_name" in payload: profile.first_name = payload["first_name"]
        if "last_name" in payload: profile.last_name = payload["last_name"]
        if "specialization" in payload: profile.specialization = payload["specialization"]
        if "phone" in payload: profile.phone_number = payload["phone"]
        session.add(profile)
    
    session.add(user)
    session.commit()
    
    log_audit(
        session, current_user.id, "UPDATE_DOCTOR",
        target_type="DOCTOR", target_id=doctor_id,
        details=payload
    )
    
    return {"message": "Doctor updated successfully"}

@router.patch("/doctors/{doctor_id}/status", response_model=Dict[str, Any])
def update_doctor_status(
    doctor_id: UUID,
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """
    Update doctor status with allowed transitions:
    - ACTIVE → ON_LEAVE, INACTIVE
    - ON_LEAVE → ACTIVE, INACTIVE
    - INACTIVE → ACTIVE only
    """
    import logging
    logger = logging.getLogger(__name__)
    
    new_status_str = payload.get("status")
    if not new_status_str:
        raise HTTPException(status_code=400, detail="Status is required")
    
    # Validate new status value
    try:
        new_status = DoctorStatus(new_status_str)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: ACTIVE, ON_LEAVE, INACTIVE"
        )
    
    # Find doctor user
    user = session.get(User, doctor_id)
    if not user or user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Find doctor profile
    profile = session.exec(
        select(DoctorProfile).where(DoctorProfile.user_id == doctor_id)
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    current_status = profile.status or DoctorStatus.AVAILABLE
    
    # Define allowed transitions
    allowed_transitions = {
        DoctorStatus.AVAILABLE: [DoctorStatus.ON_LEAVE, DoctorStatus.DEACTIVATED],
        DoctorStatus.ON_LEAVE: [DoctorStatus.AVAILABLE, DoctorStatus.DEACTIVATED],
        DoctorStatus.DEACTIVATED: [DoctorStatus.AVAILABLE],  # Can only reactivate
    }
    
    if new_status == current_status:
        return {"message": f"Doctor is already {current_status.value}"}
    
    if new_status not in allowed_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change status from {current_status.value} to {new_status.value}. "
                   f"Allowed: {[s.value for s in allowed_transitions.get(current_status, [])]}"
        )
    
    # Update status
    old_status = current_status.value
    profile.status = new_status
    profile.updated_at = datetime.utcnow()
    session.add(profile)
    session.commit()
    
    logger.info(f"Doctor {user.email} status changed: {old_status} → {new_status.value}")
    
    # Log audit
    log_audit(
        session, current_user.id, "CHANGE_DOCTOR_STATUS",
        target_type="DOCTOR", target_id=doctor_id,
        details={"old_status": old_status, "new_status": new_status.value}
    )
    
    return {
        "message": f"Doctor status changed to {new_status.value}",
        "old_status": old_status,
        "new_status": new_status.value
    }

@router.patch("/doctors/{doctor_id}/availability", response_model=Dict[str, Any])
def update_doctor_availability(
    doctor_id: UUID,
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """
    Simple availability toggle endpoint.
    Accepts: { "availability": "AVAILABLE" | "ON_LEAVE" }
    
    - Idempotent: same status returns 200 OK (no error)
    - Returns full doctor object for UI update
    - Commits transaction before response
    - DEACTIVATED doctors cannot be toggled (must use /status endpoint)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        new_status_str = payload.get("availability") or payload.get("status")
        if not new_status_str:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "detail": "availability is required"}
            )
        
        # Normalize old values to new - ACTIVE maps to AVAILABLE
        if new_status_str == "ACTIVE":
            new_status_str = "AVAILABLE"
        if new_status_str == "INACTIVE":
            new_status_str = "DEACTIVATED"
        
        # Only allow AVAILABLE or ON_LEAVE for availability toggle
        if new_status_str not in ["AVAILABLE", "ON_LEAVE"]:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "detail": "Invalid availability. Use AVAILABLE or ON_LEAVE."}
            )
        
        new_status = DoctorStatus(new_status_str)
        
        # Find doctor user
        user = session.get(User, doctor_id)
        if not user or user.role != UserRole.DOCTOR:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "detail": "Doctor not found"}
            )
        
        # Find doctor profile
        profile = session.exec(
            select(DoctorProfile).where(DoctorProfile.user_id == doctor_id)
        ).first()
        
        if not profile:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "detail": "Doctor profile not found"}
            )
        
        # Get current status, normalize old values
        current_status_value = profile.status
        if current_status_value is None:
            current_status_value = DoctorStatus.AVAILABLE
        
        # Handle old ACTIVE/INACTIVE values in database
        try:
            if hasattr(current_status_value, 'value'):
                current_status_str = current_status_value.value
            else:
                current_status_str = str(current_status_value)
            
            # Normalize old values
            if current_status_str == "ACTIVE":
                current_status_value = DoctorStatus.AVAILABLE
            elif current_status_str == "INACTIVE":
                current_status_value = DoctorStatus.DEACTIVATED
        except Exception as e:
            logger.warning(f"Status normalization warning: {e}")
            current_status_value = DoctorStatus.AVAILABLE
        
        # Check if doctor is DEACTIVATED - cannot toggle availability
        if current_status_value == DoctorStatus.DEACTIVATED:
            return JSONResponse(
                status_code=403,
                content={"status": "error", "detail": "Cannot change availability of deactivated doctor. Reactivate first."}
            )
        
        # Idempotent: same status is success (no-op)
        if new_status == current_status_value:
            logger.info(f"Doctor {user.email} availability unchanged: {new_status.value}")
            return {
                "status": "ok",
                "message": f"Doctor is already {new_status.value}",
                "doctor_id": str(doctor_id),
                "availability": new_status.value
            }
        
        # Update status
        old_status = current_status_value.value if hasattr(current_status_value, 'value') else str(current_status_value)
        profile.status = new_status
        profile.updated_at = datetime.utcnow()
        session.add(profile)
        session.commit()
        session.refresh(profile)
        
        logger.info(f"Doctor {user.email} availability changed: {old_status} → {new_status.value}")
        
        # Log audit
        log_audit(
            session, current_user.id, "CHANGE_DOCTOR_AVAILABILITY",
            target_type="DOCTOR", target_id=doctor_id,
            details={"old_status": old_status, "new_status": new_status.value}
        )
        
        return {
            "status": "ok",
            "message": f"Doctor is now {new_status.value}",
            "doctor_id": str(doctor_id),
            "availability": new_status.value
        }
        
    except Exception as e:
        logger.error(f"Error updating doctor availability: {e}")
        session.rollback()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "detail": str(e)}
        )

# ============ FRONT DESK MANAGEMENT ============

@router.get("/frontdesk", response_model=List[Dict[str, Any]])
def list_frontdesk(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """List all front desk staff"""
    query = (
        select(User, FrontDeskProfile)
        .outerjoin(FrontDeskProfile, User.id == FrontDeskProfile.user_id)
        .where(User.role == UserRole.FRONT_DESK)
    )
    results = session.exec(query).all()
    
    staff = []
    for user, profile in results:
        # Determine status: use profile.status if available, otherwise check is_active
        if profile and hasattr(profile, 'status') and profile.status:
            status = profile.status.value if hasattr(profile.status, 'value') else str(profile.status)
        else:
            status = "ACTIVE" if (user.is_active if hasattr(user, 'is_active') else True) else "INACTIVE"
        
        staff.append({
            "id": str(user.id),
            "email": user.email,
            "status": status,
            "first_name": profile.first_name if profile else None,
            "last_name": profile.last_name if profile else None,
            "phone_number": profile.phone_number if profile else None,
            "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') else None
        })
    return staff

@router.post("/frontdesk", response_model=Dict[str, Any])
def create_frontdesk(
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Create a new front desk account (MASTER_ADMIN only)"""
    email = payload.get("email")
    password = payload.get("password", "TempPassword123!")
    first_name = payload.get("first_name", "")
    last_name = payload.get("last_name", "")
    phone = payload.get("phone", "")
    
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    new_user = User(
        email=email,
        password_hash=get_password_hash(password),
        role=UserRole.FRONT_DESK
    )
    session.add(new_user)
    session.flush()
    session.refresh(new_user)
    
    profile = FrontDeskProfile(
        user_id=new_user.id,
        first_name=first_name,
        last_name=last_name,
        phone_number=phone
    )
    session.add(profile)
    session.commit()
    
    log_audit(
        session, current_user.id, "CREATE_FRONTDESK",
        target_type="FRONT_DESK", target_id=new_user.id,
        details={"email": email, "name": f"{first_name} {last_name}"}
    )
    
    return {"message": "Front Desk staff created successfully", "id": str(new_user.id)}

@router.patch("/frontdesk/{staff_id}", response_model=Dict[str, Any])
def update_frontdesk(
    staff_id: UUID,
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Update or deactivate front desk staff"""
    user = session.get(User, staff_id)
    if not user or user.role != UserRole.FRONT_DESK:
        raise HTTPException(status_code=404, detail="Front desk staff not found")
    
    if "is_active" in payload:
        if hasattr(user, 'is_active'):
            user.is_active = payload["is_active"]
    
    profile = session.exec(
        select(FrontDeskProfile).where(FrontDeskProfile.user_id == staff_id)
    ).first()
    
    if profile:
        if "first_name" in payload: profile.first_name = payload["first_name"]
        if "last_name" in payload: profile.last_name = payload["last_name"]
        if "phone" in payload: profile.phone_number = payload["phone"]
        session.add(profile)
    
    session.add(user)
    session.commit()
    
    log_audit(
        session, current_user.id, "UPDATE_FRONTDESK",
        target_type="FRONT_DESK", target_id=staff_id,
        details=payload
    )
    
    return {"message": "Front Desk staff updated successfully"}

@router.patch("/frontdesk/{staff_id}/deactivate", response_model=Dict[str, Any])
def deactivate_frontdesk(
    staff_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Deactivate front desk staff account"""
    user = session.get(User, staff_id)
    if not user or user.role != UserRole.FRONT_DESK:
        raise HTTPException(status_code=404, detail="Front desk staff not found")
    
    profile = session.exec(
        select(FrontDeskProfile).where(FrontDeskProfile.user_id == staff_id)
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Front desk profile not found")
    
    if profile.status == FrontDeskStatus.INACTIVE:
        return {"message": "Staff is already inactive", "status": "INACTIVE"}
    
    profile.status = FrontDeskStatus.INACTIVE
    profile.updated_at = datetime.utcnow()
    session.add(profile)
    session.commit()
    
    log_audit(
        session, current_user.id, "DEACTIVATE_FRONT_DESK",
        target_type="FRONT_DESK", target_id=staff_id,
        details={"old_status": "ACTIVE", "new_status": "INACTIVE"}
    )
    
    return {
        "message": "Staff deactivated successfully",
        "id": str(staff_id),
        "status": "INACTIVE"
    }

@router.patch("/frontdesk/{staff_id}/reactivate", response_model=Dict[str, Any])
def reactivate_frontdesk(
    staff_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Reactivate front desk staff account"""
    user = session.get(User, staff_id)
    if not user or user.role != UserRole.FRONT_DESK:
        raise HTTPException(status_code=404, detail="Front desk staff not found")
    
    profile = session.exec(
        select(FrontDeskProfile).where(FrontDeskProfile.user_id == staff_id)
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Front desk profile not found")
    
    if profile.status == FrontDeskStatus.ACTIVE:
        return {"message": "Staff is already active", "status": "ACTIVE"}
    
    profile.status = FrontDeskStatus.ACTIVE
    profile.updated_at = datetime.utcnow()
    session.add(profile)
    session.commit()
    
    log_audit(
        session, current_user.id, "REACTIVATE_FRONT_DESK",
        target_type="FRONT_DESK", target_id=staff_id,
        details={"old_status": "INACTIVE", "new_status": "ACTIVE"}
    )
    
    return {
        "message": "Staff reactivated successfully",
        "id": str(staff_id),
        "status": "ACTIVE"
    }

# ============ PATIENTS (READ-ONLY) ============

@router.get("/patients", response_model=List[Dict[str, Any]])
def list_patients(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """List all patients (read-only view)"""
    query = (
        select(User, PatientProfile)
        .outerjoin(PatientProfile, User.id == PatientProfile.user_id)
        .where(User.role == UserRole.PATIENT)
    )
    results = session.exec(query).all()
    
    patients = []
    for user, profile in results:
        patients.append({
            "id": str(user.id),
            "email": user.email,
            "is_active": user.is_active if hasattr(user, 'is_active') else True,
            "first_name": profile.first_name if profile else None,
            "last_name": profile.last_name if profile else None,
            "phone_number": profile.phone_number if profile else None,
            "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') else None
        })
    return patients

@router.post("/patients", response_model=Dict[str, Any])
def create_patient(
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """
    Create a patient account (MASTER_ADMIN only).
    
    Admin-created patients:
    - Can log in immediately
    - Are auto-verified
    - Have temporary password that should be reset
    """
    import secrets
    import string
    from app.core.security import get_password_hash
    
    email = payload.get("email")
    full_name = payload.get("full_name", "")
    phone = payload.get("phone")
    date_of_birth = payload.get("date_of_birth")
    gender = payload.get("gender")
    password = payload.get("password")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    
    # Check if email already exists
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    
    # Parse full name into first/last
    name_parts = full_name.strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    
    # Auto-generate secure password if not provided
    if not password:
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        password = ''.join(secrets.choice(alphabet) for _ in range(12))
    
    # Create user
    new_user = User(
        email=email,
        password_hash=get_password_hash(password),
        role=UserRole.PATIENT,
        is_active=True
    )
    session.add(new_user)
    session.flush()
    session.refresh(new_user)
    
    # Create patient profile
    normalized_gender = gender.upper() if gender else None
    new_profile = PatientProfile(
        user_id=new_user.id,
        first_name=first_name,
        last_name=last_name,
        phone_number=phone,
        gender=normalized_gender
    )
    session.add(new_profile)
    session.commit()
    
    # Audit log
    log_audit(
        session, current_user.id, "ADMIN_CREATED_PATIENT",
        target_type="PATIENT", target_id=new_user.id,
        details={"email": email, "name": full_name, "created_by": "MASTER_ADMIN"}
    )
    
    return {
        "message": "Patient account created successfully",
        "id": str(new_user.id),
        "email": email,
        "name": full_name,
        "temporary_password": password  # Return so admin can share with patient
    }

@router.patch("/patients/{patient_id}/status", response_model=Dict[str, Any])
def update_patient_status(
    patient_id: UUID,
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Activate or deactivate a patient account"""
    user = session.get(User, patient_id)
    if not user or user.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if "is_active" in payload and hasattr(user, 'is_active'):
        user.is_active = payload["is_active"]
        session.add(user)
        session.commit()
        
        log_audit(
            session, current_user.id, 
            "ACTIVATE_PATIENT" if payload["is_active"] else "DEACTIVATE_PATIENT",
            target_type="PATIENT", target_id=patient_id
        )
    
    return {"message": "Patient status updated"}

# ============ CLINICS ============

@router.get("/clinics", response_model=List[Dict[str, Any]])
def list_clinics(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """List all clinics/departments"""
    clinics = session.exec(select(Clinic)).all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "location": c.location,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat()
        }
        for c in clinics
    ]

@router.post("/clinics", response_model=Dict[str, Any])
def create_clinic(
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Create a new clinic/department"""
    clinic = Clinic(
        name=payload.get("name"),
        location=payload.get("location")
    )
    session.add(clinic)
    session.commit()
    session.refresh(clinic)
    
    log_audit(
        session, current_user.id, "CREATE_CLINIC",
        target_type="CLINIC", target_id=clinic.id,
        details={"name": clinic.name}
    )
    
    return {"message": "Clinic created successfully", "id": str(clinic.id)}

@router.patch("/clinics/{clinic_id}", response_model=Dict[str, Any])
def update_clinic(
    clinic_id: UUID,
    payload: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Update a clinic"""
    clinic = session.get(Clinic, clinic_id)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    if "name" in payload: clinic.name = payload["name"]
    if "location" in payload: clinic.location = payload["location"]
    if "is_active" in payload: clinic.is_active = payload["is_active"]
    clinic.updated_at = datetime.utcnow()
    
    session.add(clinic)
    session.commit()
    
    log_audit(
        session, current_user.id, "UPDATE_CLINIC",
        target_type="CLINIC", target_id=clinic_id,
        details=payload
    )
    
    return {"message": "Clinic updated successfully"}

# ============ AUDIT LOGS ============

@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def get_audit_logs(
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Get recent audit logs"""
    logs = session.exec(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    ).all()
    
    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": str(log.target_id) if log.target_id else None,
            "details": json.loads(log.details) if log.details else None,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]

# ============ DASHBOARD STATS ============

@router.get("/stats", response_model=Dict[str, Any])
def get_dashboard_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.MASTER_ADMIN]))
):
    """Get dashboard statistics"""
    doctor_count = len(session.exec(select(User).where(User.role == UserRole.DOCTOR)).all())
    frontdesk_count = len(session.exec(select(User).where(User.role == UserRole.FRONT_DESK)).all())
    patient_count = len(session.exec(select(User).where(User.role == UserRole.PATIENT)).all())
    clinic_count = len(session.exec(select(Clinic)).all())
    
    return {
        "doctors": doctor_count,
        "frontdesk": frontdesk_count,
        "patients": patient_count,
        "clinics": clinic_count
    }
