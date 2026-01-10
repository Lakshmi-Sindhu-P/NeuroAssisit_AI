from sqlalchemy import text
from app.core.db import engine
from sqlmodel import Session

def migrate_db():
    print("Starting Universal Migration...")
    with Session(engine) as session:
        # Columns to add
        columns = [
            "age INTEGER", 
            "gender_identity VARCHAR", 
            "emergency_contact_name VARCHAR", 
            "emergency_contact_phone VARCHAR", 
            "current_medications VARCHAR",
            "medical_history VARCHAR"
        ]
        
        for col in columns:
            col_name = col.split()[0]
            sql = f"ALTER TABLE patient_profiles ADD COLUMN {col}"
            try:
                print(f"Adding {col_name}...")
                session.connection().execute(text(sql))
                session.commit()
                print(f"✅ Added {col_name}")
            except Exception as e:
                session.rollback() # Important for Postgres transaction state
                print(f"⚠️ Could not add {col_name} (might exist): {e}")

if __name__ == "__main__":
    migrate_db()
