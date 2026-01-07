from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import User, UserRole
from app.core.security import get_password_hash

def reset_doctor_password():
    with Session(engine) as session:
        # Find the doctor
        doctor = session.exec(select(User).where(User.email == "dr.alexander@neuro.com")).first()
        
        if not doctor:
            print("❌ Doctor 'dr.alexander@neuro.com' not found.")
            return

        # Generate new hash for 'hashed_dummy_pass'
        new_password = "password123"
        new_hash = get_password_hash(new_password)
        
        doctor.password_hash = new_hash
        session.add(doctor)
        session.commit()
        session.refresh(doctor)
        
        print(f"✅ Password reset for {doctor.email}.")
        print(f"   New Password: {new_password}")

if __name__ == "__main__":
    reset_doctor_password()
