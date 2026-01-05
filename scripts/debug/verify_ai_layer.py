import asyncio
import os
from app.services.stt_service import AssemblyAIService
from app.services.llm_service import GeminiService
from dotenv import load_dotenv

# Load Env
load_dotenv()

async def verify_ai_layer():
    audio_path = os.path.abspath("test-audios/day1_consultation01_doctor.wav")
    textgrid_path = os.path.abspath("test-audio-transcripts/day1_consultation01_doctor.TextGrid")
    
    print(f"--- 🧪 Starting AI Layer Verification ---")
    print(f"🎵 Audio File: {audio_path}")
    
    # 1. STT (AssemblyAI)
    print("\n[1/3] Running AssemblyAI STT...")
    try:
        transcript_result = await AssemblyAIService.transcribe_audio_async(audio_path)
        transcript_text = transcript_result["text"]
        print(f"✅ STT Success!")
        print(f"📝 Transcript Preview: {transcript_text[:200]}...")
    except Exception as e:
        print(f"❌ STT Failed: {e}")
        return

    # 2. Ground Truth (TextGrid)
    print("\n[2/3] Reading Ground Truth (TextGrid)...")
    try:
        with open(textgrid_path, "r") as f:
            content = f.read()
            # Simple dumb parse to extract some text for visual comparison
            # TextGrid usually has line "text = "..." "
            lines = [l.strip() for l in content.splitlines() if "text =" in l]
            sample_ground_truth = " ".join([l.replace('text = "', '').replace('"', '') for l in lines[:10]])
            print(f"📄 Ground Truth Preview: {sample_ground_truth}...")
    except Exception as e:
        print(f"⚠️ Could not read TextGrid: {e}")

    # 3. LLM (Gemini)
    print("\n[3/3] Running Gemini 2.5 SOAP Generation...")
    try:
        # Mock patient context
        patient_context = {
            "first_name": "Test",
            "last_name": "Patient",
            "age": 45,
            "gender": "Male",
            "notes": "History of hypertension."
        }
        
        soap_note = await GeminiService.generate_soap_note_async(
            transcript_text=transcript_text,
            speaker_labels=transcript_result.get("utterances", []),
            patient_context=patient_context
        )
        
        print(f"✅ Gemini 2.5 Success!")
        print("\n📋 GENERATED SOAP NOTE:")
        import json
        print(json.dumps(soap_note, indent=2))
        
    except Exception as e:
        print(f"❌ Gemini Failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify_ai_layer())
