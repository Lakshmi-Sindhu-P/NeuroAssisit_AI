from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import AudioFile
from uuid import UUID

def check_audio_file():
    consultation_id = UUID("5bdd7e68-faf7-4b55-a478-388987a56a39")
    with Session(engine) as session:
        audio_file = session.exec(
            select(AudioFile)
            .where(AudioFile.consultation_id == consultation_id)
        ).first()
        
        if audio_file:
            print(f"File ID: {audio_file.id}")
            print(f"File Name: {audio_file.file_name}")
            print(f"File URL: {audio_file.file_url}")
            print(f"File Type: {audio_file.file_type}")
        else:
            print("No audio file found for this consultation.")

if __name__ == "__main__":
    check_audio_file()
