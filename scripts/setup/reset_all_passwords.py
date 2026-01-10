from sqlmodel import Session, select, SQLModel
from app.core.db import engine
from app.models.base import User, UserRole, DoctorProfile, PatientProfile, FrontDeskProfile, DoctorStatus
from app.core.security import get_password_hash
from datetime import datetime, timedelta

def reset_passwords():
    # SQLModel.metadata.create_all(engine) # Assume tables exist clearly
    
    users_to_fix = [
        # Role, Email, Password, Name
        (UserRole.MASTER_ADMIN, "admin@neuro.com", "admin123", "Admin", "User"),
        (UserRole.FRONT_DESK, "frontdesk@neuro.com", "password123", "Front", "Desk"),
        (UserRole.DOCTOR, "dr.smith@neuro.com", "password123", "John", "Smith"),
        (UserRole.PATIENT, "ram.prasad@example.com", "password123", "Ram", "Prasad"),
        (UserRole.PATIENT, "priya.sharma@example.com", "password123", "Priya", "Sharma"),
    ]
    
    with Session(engine) as session:
        for role, email, pwd, fname, lname in users_to_fix:
            user = session.exec(select(User).where(User.email == email)).first()
            hashed_pw = get_password_hash(pwd)
            
            if not user:
                print(f"Creating missing user: {email}")
                user = User(
                    email=email,
                    password_hash=hashed_pw,
                    role=role,
                    is_active=True
                )
                session.add(user)
                session.commit()
                session.refresh(user)
                
                # Create Profile
                if role == UserRole.DOCTOR:
                    profile = DoctorProfile(
                        user_id=user.id,
                        first_name=fname,
                        last_name=lname,
                        status=DoctorStatus.AVAILABLE,
                        specialization="Neurology"
                    )
                    session.add(profile)
                elif role == UserRole.PATIENT:
                    profile = PatientProfile(
                        user_id=user.id,
                        first_name=fname,
                        last_name=lname,
                        gender="Male" if fname == "Ram" else "Female",
                        date_of_birth=datetime.utcnow() - timedelta(days=365*30)
                    )
                    session.add(profile)
                elif role == UserRole.FRONT_DESK:
                    profile = FrontDeskProfile(
                        user_id=user.id,
                        first_name=fname,
                        last_name=lname
                    )
                    session.add(profile)
                    
                session.commit()
            else:
                print(f"Resetting password for: {email}")
                user.password_hash = hashed_pw
                user.role = role # Ensure role
                session.add(user)
                session.commit()
                session.refresh(user)

                # Ensure Profile Exists even if user existed
                if role == UserRole.PATIENT:
                    profile = session.exec(select(PatientProfile).where(PatientProfile.user_id == user.id)).first()
                    if not profile:
                        print(f"  -> Creating missing PatientProfile for {email}")
                        profile = PatientProfile(
                            user_id=user.id,
                            first_name=fname,
                            last_name=lname,
                            gender="Male",
                            date_of_birth=datetime.utcnow() - timedelta(days=365*30)
                        )
                        session.add(profile)
                        session.commit()

                elif role == UserRole.DOCTOR:
                    profile = session.exec(select(DoctorProfile).where(DoctorProfile.user_id == user.id)).first()
                    if not profile:
                        print(f"  -> Creating missing DoctorProfile for {email}")
                        profile = DoctorProfile(
                            user_id=user.id,
                            first_name=fname,
                            last_name=lname,
                            status=DoctorStatus.AVAILABLE,
                            specialization="Neurology"
                        )
                        session.add(profile)
                        session.commit()
                        
    print("\n✅ Credentials Configured:")
    for role, email, pwd, _, _ in users_to_fix:
        print(f"  {role.name}: {email} / {pwd}")

if __name__ == "__main__":
    try:
        reset_passwords()
    except Exception as e:
        print(f"Error: {e}")
