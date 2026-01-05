from sqlmodel import Session, select, SQLModel
from app.core.db import engine, get_session
from app.models.base import User, UserRole, DoctorProfile
from app.core.security import get_password_hash
from uuid import uuid4

def create_doctor():
    # Ensure tables exist (since we just switched to SQLite)
    SQLModel.metadata.create_all(engine)

    email = "dr.alexander@neuro.com"
    password = "password123"
    
    with Session(engine) as session:
        # Check if exists
        try:
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                print(f"User {email} already exists.")
                return
        except Exception as e:
            # If table doesn't exist despite create_all, we might have an issue, but standard flow should work
            print(f"Warning checking user: {e}")

        # Create User
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.DOCTOR,
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create Profile
        profile = DoctorProfile(
            user_id=user.id,
            first_name="Alexander",
            last_name="Fleming",
            specialization="Neurology",
            license_number=f"LIC-{str(uuid4())[:8]}",
            years_of_experience=15,
            qualification="MD, PhD"
        )
        session.add(profile)
        session.commit()
        
        print(f"✅ Doctor Account Created:\nEmail: {email}\nPassword: {password}")

if __name__ == "__main__":
    create_doctor()
