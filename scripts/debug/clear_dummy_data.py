from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import Consultation, AudioFile
from uuid import UUID

def clear_data():
    cid = UUID("c3351697-8ab1-4fff-ac66-ba39e307fba8")
    with Session(engine) as session:
        consultation = session.get(Consultation, cid)
        if consultation:
            consultation.notes = None
            consultation.diagnosis = None
            consultation.prescription = None
            session.add(consultation)
            
            # Clear audio transcripts
            audios = session.exec(select(AudioFile).where(AudioFile.consultation_id == cid)).all()
            for a in audios:
                a.transcription = None
                session.add(a)
            
            # Delete SOAP
            if consultation.soap_note:
                session.delete(consultation.soap_note)
                
            session.commit()
            print(f"Cleared data for {cid}")
        else:
            print("Consultation not found")

if __name__ == "__main__":
    clear_data()
