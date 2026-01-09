from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import User

def verify_dr_smith():
    print("Connecting to database...")
    with Session(engine) as session:
        statement = select(User).where(User.email == "dr.smith@neuro.com")
        user = session.exec(statement).first()
        
        if user:
            print(f"FOUND: Dr. Smith account exists.")
            print(f"  - ID: {user.id}")
            print(f"  - Email: {user.email}")
            print(f"  - Role: {user.role}")
            print(f"  - Full Name: {user.full_name}")
        else:
            print("NOT FOUND: Dr. Smith account does NOT exist in the current database.")
            
            # Check for other users to be helpful
            print("\nListing first 5 users found:")
            users = session.exec(select(User).limit(5)).all()
            for u in users:
                print(f"  - {u.email} ({u.role})")

if __name__ == "__main__":
    verify_dr_smith()
