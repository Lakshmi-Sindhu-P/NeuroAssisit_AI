import asyncio
from uuid import UUID
from sqlmodel import Session, select
from app.core.db import engine
from app.services.consultation_processor import process_transcription_only
from app.models.base import Consultation, AudioFile

async def run_fix():
    cons_id = UUID("e0c14724-a61d-4507-a75a-a4928d16ca40")
    print(f"Force processing {cons_id}...")
    
    with Session(engine) as session:
        # Find audio ID
        audio = session.exec(select(AudioFile).where(AudioFile.consultation_id == cons_id)).first()
        if not audio:
            print("No audio file found!")
            return
        audio_id = audio.id

    # Run the processor (synchronously waiting for the async func)
    await process_transcription_only(cons_id, audio_id)
    print("DONE! Frontend should auto-update in ~3 seconds.")

if __name__ == "__main__":
    asyncio.run(run_fix())
