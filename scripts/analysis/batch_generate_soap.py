import asyncio
import os
import glob
import json
from app.services.stt_service import AssemblyAIService
from app.services.llm_service import GeminiService
from dotenv import load_dotenv

load_dotenv()

input_dir = "Neruro AI Convo Audio"
output_dir = "soap_generated_outputs"

async def process_file(audio_path):
    filename = os.path.basename(audio_path)
    output_path = os.path.join(output_dir, filename.replace(".aac", ".json"))
    
    print(f"🔹 Processing: {filename}...")
    
    try:
        # 1. Transcribe (Identity-Only Redaction by default)
        # Using abspath is safer for AssemblyAI
        abs_path = os.path.abspath(audio_path)
        transcript_res = await AssemblyAIService.transcribe_audio_async(abs_path)
        
        # 2. Generate SOAP
        # Mock context (since we don't have patient DB for these raw files)
        mock_context = {
            "first_name": "Review",
            "last_name": "Patient",
            "age": "N/A",
            "gender": "N/A",
            "notes": "Batch processed audio."
        }
        
        soap_note = await GeminiService.generate_soap_note_async(
            transcript_text=transcript_res["text"],
            speaker_labels=transcript_res.get("utterances", []),
            patient_context=mock_context
        )
        
        # 3. Save
        final_output = {
            "source_file": filename,
            "transcript_text": transcript_res["text"],
            "soap_note": soap_note
        }
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_output, f, indent=2)
            
        print(f"   ✅ Saved SOAP note to: {output_path}")
        return True
        
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

async def batch_process():
    print(f"--- 🏥 Batch SOAP Generation : {input_dir} ---")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    audio_files = glob.glob(os.path.join(input_dir, "*-audio.aac"))
    audio_files.sort()
    
    print(f"Found {len(audio_files)} files. Starting Gemini 2.5 Pipeline...\n")
    
    success_count = 0
    for f in audio_files:
        if await process_file(f):
            success_count += 1
            
    print(f"\n✨ Batch Complete. Successfully generated {success_count}/{len(audio_files)} SOAP notes.")
    print(f"📂 Outputs saved in: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    asyncio.run(batch_process())
