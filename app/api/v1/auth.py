from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.base import User, PatientProfile, DoctorProfile, FrontDeskProfile, UserRole
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID, uuid4

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)
    role: UserRole
    first_name: str
    last_name: str
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

@router.post("/signup", response_model=dict)
def signup(user_in: UserCreate, session: Session = Depends(get_session)):
    """
    Public signup endpoint - ONLY for PATIENT accounts.
    Doctor and Front Desk accounts must be created by administrators.
    Role is ALWAYS set to PATIENT regardless of what's sent.
    """
    try:
        # Check if user exists
        user_db = session.exec(select(User).where(User.email == user_in.email)).first()
        if user_db:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # SECURITY: Force PATIENT role for all public signups
        # Doctor and Front Desk accounts can only be created by admin
        new_user = User(
            email=user_in.email,
            password_hash=get_password_hash(user_in.password),
            role=UserRole.PATIENT  # Always PATIENT, ignore any role sent
        )
        session.add(new_user)
        session.flush()  # Get ID but don't commit yet
        session.refresh(new_user)
        
        # Create PatientProfile (only patients can register via public signup)
        normalized_gender = user_in.gender.upper() if user_in.gender else None
        new_profile = PatientProfile(
            user_id=new_user.id,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            phone_number=user_in.phone,
            gender=normalized_gender
        )
        session.add(new_profile)
        
        session.commit()
        
        return {"message": "User created successfully", "user_id": str(new_user.id)}
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log the error and return a proper error response
        import traceback
        print(f"Signup error: {e}")
        traceback.print_exc()
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Signup failed: {str(e)}")

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    """
    Login endpoint - authenticates using email + password only.
    Compatible with OAuth2 form data (username/password).
    Role is determined from database, not from frontend.
    Fails with 403 if user has no role assigned.
    Fails with 403 if doctor is INACTIVE.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # 1. Find user by email (form_data.username contains the email)
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    
    # 2. Validate credentials
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # 3. CRITICAL: Validate role is assigned
    if user.role is None:
        logger.error(f"LOGIN DENIED: User {user.email} (id={user.id}) has no role assigned")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not assigned. Contact administrator.",
        )
    
    # 4. Get role value safely
    try:
        role_value = user.role.value if hasattr(user.role, 'value') else str(user.role)
    except Exception as e:
        logger.error(f"LOGIN DENIED: Failed to get role for user {user.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not assigned. Contact administrator.",
        )
    
    # 5. Validate role is one of allowed values
    valid_roles = ["PATIENT", "DOCTOR", "FRONT_DESK", "MASTER_ADMIN"]
    if role_value not in valid_roles:
        logger.error(f"LOGIN DENIED: User {user.email} has invalid role: {role_value}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role. Contact administrator.",
        )
    
    # 6. CRITICAL: Check doctor status - DEACTIVATED doctors cannot login
    if role_value == "DOCTOR":
        from app.models.base import DoctorProfile, DoctorStatus
        profile = session.exec(
            select(DoctorProfile).where(DoctorProfile.user_id == user.id)
        ).first()
        
        if profile and profile.status == DoctorStatus.DEACTIVATED:
            logger.error(f"LOGIN DENIED: Doctor {user.email} is DEACTIVATED")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Contact administrator.",
            )
        
        # Log if doctor is on leave (allowed but noted)
        if profile and profile.status == DoctorStatus.ON_LEAVE:
            logger.info(f"LOGIN: Doctor {user.email} is on leave but logging in")
    
    # 7. CRITICAL: Check front desk status - INACTIVE staff cannot login
    if role_value == "FRONT_DESK":
        from app.models.base import FrontDeskProfile, FrontDeskStatus, AuditLog
        from datetime import datetime
        profile = session.exec(
            select(FrontDeskProfile).where(FrontDeskProfile.user_id == user.id)
        ).first()
        
        if profile and profile.status == FrontDeskStatus.INACTIVE:
            logger.error(f"LOGIN BLOCKED: Front desk {user.email} account is INACTIVE")
            
            # Log blocked login attempt to audit_logs
            audit_log = AuditLog(
                user_id=user.id,
                action="LOGIN_BLOCKED_INACTIVE_ACCOUNT",
                target_type="FRONT_DESK",
                target_id=user.id,
                details={"reason": "Account inactive", "email": user.email}
            )
            session.add(audit_log)
            session.commit()
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "ACCOUNT_INACTIVE",
                    "message": "Your account has been deactivated. Please contact the administrator."
                }
            )
    
    # 8. Create token with role embedded
    logger.info(f"LOGIN SUCCESS: {user.email} with role {role_value}")
    access_token = create_access_token(subject=user.id, role=role_value)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role_value
    }

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = session.get(User, user_id)
    if user is None:
        raise credentials_exception
    return user

@router.get("/me", response_model=User)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
