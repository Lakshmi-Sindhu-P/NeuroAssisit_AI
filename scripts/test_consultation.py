import sys
import os
sys.path.append(os.getcwd())

from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import Consultation, Appointment, User, PatientProfile
from sqlalchemy.orm import selectinload
from uuid import UUID

def test_get_consultation(consultation_id_str):
    try:
        consultation_id = UUID(consultation_id_str)
    except ValueError:
        print(f"Invalid UUID: {consultation_id_str}")
        return

    with Session(engine) as session:
        print(f"Fetching consultation: {consultation_id}...")
        consultation = session.exec(
            select(Consultation)
            .where(Consultation.id == consultation_id)
            .options(
                selectinload(Consultation.audio_files), 
                selectinload(Consultation.soap_note),
                selectinload(Consultation.appointment).selectinload(Appointment.patient).selectinload(User.patient_profile)
            )
        ).first()

        if not consultation:
            print("Consultation NOT FOUND in DB.")
            return

        print(f"Found Consultation: {consultation.id}")
        
        # Test manual assignment logic
        if consultation.appointment and consultation.appointment.patient and consultation.appointment.patient.patient_profile:
             print("Patient Profile Found:")
             print(consultation.appointment.patient.patient_profile)
             # Try assignment
             try:
                 consultation.patient_profile = consultation.appointment.patient.patient_profile
                 print("Assignment Successful (Python object level)")
             except Exception as e:
                 print(f"Assignment Failed: {e}")
        else:
            print("Patient Profile NOT reachable via relationships.")

if __name__ == "__main__":
    # ID from screenshot: 3ef35e94-ab52-4ad3-95e5-5a8a4a77693c
    test_get_consultation("3ef35e94-ab52-4ad3-95e5-5a8a4a77693c")
