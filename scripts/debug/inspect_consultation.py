from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import Consultation
from uuid import UUID

def check_consultation():
    try:
        # ID from the screenshot
        cid = UUID("a9657931-0fe8-43ca-8ee3-f97ca6f1cf46")
        
        with Session(engine) as session:
            consultation = session.get(Consultation, cid)
            if consultation:
                print(f"Status: {consultation.status}")
                print(f"Has SOAP Note: {consultation.soap_note is not None}")
                print(f"Has Audio: {len(consultation.audio_files)}")
            else:
                print("Consultation not found")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_consultation()
