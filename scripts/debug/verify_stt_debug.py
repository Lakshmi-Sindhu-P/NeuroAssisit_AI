import asyncio
import os
from app.services.stt_service import AssemblyAIService
from dotenv import load_dotenv

load_dotenv()

async def debug_stt():
    audio_path = os.path.abspath("Neruro AI Convo Audio/1-audio.aac")
    print(f"--- 🕵️ Debugging STT for: {audio_path} ---")
    
    try:
        res = await AssemblyAIService.transcribe_audio_async(audio_path)
        print("\n📝 GENERATED TRANSCRIPT:")
        print(res["text"])
        
        # Also print utterances to see if it's a dialogue
        print("\n🗣️ UTTERANCES:")
        for u in res["utterances"][:5]: # First 5
            print(f"[{u['speaker']}]: {u['text']}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_stt())
