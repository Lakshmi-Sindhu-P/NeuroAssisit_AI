from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import AudioFile
from uuid import UUID

def check():
    consultation_id = UUID("a6934b1b-ff3a-4ddf-b480-5b5178431c7a")
    with Session(engine) as session:
        audio = session.exec(select(AudioFile).where(AudioFile.consultation_id == consultation_id)).first()
        if audio:
            print(f"Current File: {audio.file_name}")
            print(f"URL: {audio.file_url}")
        else:
            print("No audio found")

if __name__ == "__main__":
    check()
