from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import AudioFile
from app.services.consultation_processor import process_transcription_only
from uuid import UUID
import asyncio

async def trigger():
    consultation_id = UUID("5bdd7e68-faf7-4b55-a478-388987a56a39")
    print(f"Triggering transcription for {consultation_id}...")
    
    try:
        await process_transcription_only(consultation_id)
        print("Transcription process finished (check output above for success msg).")
    except Exception as e:
        print(f"Failed again: {e}")

if __name__ == "__main__":
    asyncio.run(trigger())
