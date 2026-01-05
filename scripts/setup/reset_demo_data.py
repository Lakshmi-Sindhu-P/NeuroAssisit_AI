from sqlmodel import Session, select, delete
from app.core.db import engine
from app.models.base import Consultation, Appointment, SOAPNote, AudioFile

def reset_data():
    print("🧹 Cleaning up demo data...")
    with Session(engine) as session:
        # Delete dependent tables first
        session.exec(delete(SOAPNote))
        session.exec(delete(AudioFile))
        session.exec(delete(Consultation))
        session.exec(delete(Appointment))
        session.commit()
    print("✅ All consultations and appointments cleared.")

if __name__ == "__main__":
    reset_data()
