from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import Consultation

def list_consultations():
    with Session(engine) as session:
        consults = session.exec(select(Consultation)).all()
        print(f"Found {len(consults)} consultations.")
        for c in consults:
            print(f"ID: {c.id} | Status: {c.status} | ApptID: {c.appointment_id}")

if __name__ == "__main__":
    list_consultations()
