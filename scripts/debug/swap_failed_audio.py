from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import AudioFile
from uuid import UUID

def fix_audio():
    cid = UUID("5bdd7e68-faf7-4b55-a478-388987a56a39")
    valid_file = "c9a0c110-09de-4129-bfe1-93cb21492c34.mp3"
    
    with Session(engine) as session:
        audio = session.exec(select(AudioFile).where(AudioFile.consultation_id == cid)).first()
        if audio:
            print(f"Updating audio for {cid}")
            print(f"Old file: {audio.file_name}")
            audio.file_name = valid_file
            audio.file_url = f"uploads/{valid_file}"
            session.add(audio)
            session.commit()
            print(f"New file: {audio.file_name}")
        else:
            print("No audio found")

if __name__ == "__main__":
    fix_audio()
