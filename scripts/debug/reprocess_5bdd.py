import asyncio
from uuid import UUID
from app.services.consultation_processor import process_transcription_only

async def run():
    cid = UUID("5bdd7e68-faf7-4b55-a478-388987a56a39")
    print(f"Triggering transcription for {cid}...")
    await process_transcription_only(cid)
    print("Done")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run())
