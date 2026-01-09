from sqlmodel import Session, select
from app.core.db import engine
from app.services.consultation_processor import process_transcription_only
from uuid import UUID
import asyncio

async def trigger():
    consultation_id = UUID("a6934b1b-ff3a-4ddf-b480-5b5178431c7a")
    print(f"Triggering transcription for {consultation_id}...")
    
    try:
        await process_transcription_only(consultation_id)
        print("Transcription process finished.")
    except Exception as e:
        print(f"Failed again: {e}")

if __name__ == "__main__":
    asyncio.run(trigger())
