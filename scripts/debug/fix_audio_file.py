from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import AudioFile, AudioFileType
from uuid import UUID
import os

def fix_audio_file():
    consultation_id = UUID("5bdd7e68-faf7-4b55-a478-388987a56a39")
    # A known good file from the ls output (36KB mp3)
    valid_file_name = "c9a0c110-09de-4129-bfe1-93cb21492c34.mp3"
    valid_file_path = f"uploads/{valid_file_name}"
    
    if not os.path.exists(valid_file_path):
        print(f"Error: Valid file {valid_file_path} not found!")
        return

    with Session(engine) as session:
        audio_file = session.exec(
            select(AudioFile)
            .where(AudioFile.consultation_id == consultation_id)
        ).first()
        
        if audio_file:
            print(f"Updating AudioFile {audio_file.id}...")
            print(f"Old: {audio_file.file_name}")
            
            audio_file.file_name = valid_file_name
            audio_file.file_url = valid_file_path
            # Ensure it's marked as CONSULTATION type so reprocess logic picks it up
            audio_file.file_type = AudioFileType.CONSULTATION
            
            session.add(audio_file)
            session.commit()
            print(f"Updated to: {audio_file.file_name}")
        else:
            print("No audio file found to fix.")

if __name__ == "__main__":
    fix_audio_file()
