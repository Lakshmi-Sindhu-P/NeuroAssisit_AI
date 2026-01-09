from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import AudioFile
from uuid import UUID
import os

def check_audio():
    cid = UUID("5bdd7e68-faf7-4b55-a478-388987a56a39")
    with Session(engine) as session:
        audio = session.exec(select(AudioFile).where(AudioFile.consultation_id == cid)).first()
        if audio:
            print(f"File Name: {audio.file_name}")
            print(f"File URL: {audio.file_url}")
            # Check physical file size
            path = f"uploads/{audio.file_name}"
            if os.path.exists(path):
                size = os.path.getsize(path)
                print(f"File Size: {size} bytes")
            else:
                print("File NOT FOUND on disk")
        else:
            print("No audio record found")

if __name__ == "__main__":
    check_audio()
