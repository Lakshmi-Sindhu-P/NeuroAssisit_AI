from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import Consultation, AudioFile

with Session(engine) as session:
    # Get the consultation (assuming only one is active/recent based on logs)
    # The UUID from logs is e0c14724-a61d-4507-a75a-a4928d16ca40
    cons = session.get(Consultation, "e0c14724-a61d-4507-a75a-a4928d16ca40")
    print(f"Status: {cons.status}")
    
    audio = session.exec(select(AudioFile).where(AudioFile.consultation_id == cons.id)).all()
    for a in audio:
        print(f"Audio: {a.file_name}, Verified: {a.is_transcript_verified}, Transcript Len: {len(a.transcription) if a.transcription else 0}")
