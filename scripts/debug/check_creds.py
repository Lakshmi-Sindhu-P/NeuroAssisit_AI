from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import User, UserRole
from app.core.security import verify_password

def check_doctor():
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "dr.alexander@neuro.com")).first()
        if not user:
            print("❌ User 'dr.alexander@neuro.com' NOT FOUND.")
            # List all users
            all_users = session.exec(select(User)).all()
            print("Existing users:", [u.email for u in all_users])
        else:
            print(f"✅ User found: {user.email}")
            print(f"   Role: {user.role}")
            # Test password
            is_valid = verify_password("password123", user.password_hash)
            print(f"   Password 'password123' valid? {is_valid}")

if __name__ == "__main__":
    check_doctor()
