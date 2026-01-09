from sqlmodel import Session, select, SQLModel
from app.core.db import engine
from app.models.base import User, UserRole
from app.core.security import get_password_hash

def create_users():
    SQLModel.metadata.create_all(engine)
    
    users = [
        ("frontdesk@neuro.com", "password123", UserRole.FRONT_DESK),
        ("admin@neuro.com", "admin123", UserRole.MASTER_ADMIN)
    ]
    
    with Session(engine) as session:
        for email, pwd, role in users:
            existing = session.exec(select(User).where(User.email == email)).first()
            if not existing:
                user = User(
                    email=email,
                    password_hash=get_password_hash(pwd),
                    role=role,
                    is_active=True
                )
                session.add(user)
                session.commit()
                print(f"✅ Created {role}: {email} / {pwd}")
            else:
                # Update password to ensure it matches what we tell the user
                existing.password_hash = get_password_hash(pwd)
                existing.role = role # Ensure role is correct
                session.add(existing)
                session.commit()
                print(f"🔄 Updated {role}: {email} / {pwd}")

if __name__ == "__main__":
    create_users()
