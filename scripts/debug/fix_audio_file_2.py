from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import AudioFile, AudioFileType
from uuid import UUID
import os

def fix_audio_file():
    # The new consultation ID from the logs/screenshot
    consultation_id = UUID("a6934b1b-ff3a-4ddf-b480-5b5178431c7a")
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
            audio_file.file_type = AudioFileType.CONSULTATION
            
            session.add(audio_file)
            session.commit()
            print(f"Updated to: {audio_file.file_name}")
        else:
            print("No audio file found to fix.")

if __name__ == "__main__":
    fix_audio_file()
