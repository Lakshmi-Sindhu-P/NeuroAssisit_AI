import asyncio
import os
import glob
from difflib import SequenceMatcher
from app.services.stt_service import AssemblyAIService
from dotenv import load_dotenv

load_dotenv()

dataset_dir = "Neruro AI Convo Audio"

async def run_comparison():
    print(f"--- 📊 STT Batch Comparison : {dataset_dir} ---")
    
    # 1. Find all audio files
    audio_files = glob.glob(os.path.join(dataset_dir, "*-audio.aac"))
    audio_files.sort() # Ensure consistent order
    
    results = []

    print(f"Found {len(audio_files)} files to process.\n")
    
    for audio_path in audio_files:
        filename = os.path.basename(audio_path)
        # Derive text path: 1-audio.aac -> 1-text-ai.txt
        # Pattern seems to be: replace "-audio.aac" with "-text-ai.txt"
        base_name = filename.replace("-audio.aac", "")
        text_filename = f"{base_name}-text-ai.txt"
        text_path = os.path.join(dataset_dir, text_filename)
        
        print(f"🔹 Processing: {filename}...")
        
        # 2. Read Ground Truth
        ground_truth = ""
        if os.path.exists(text_path):
            try:
                with open(text_path, "r", encoding="utf-8", errors="ignore") as f:
                    ground_truth = f.read().strip()
                    # Sanity check for binary file masquerading as text (Lesson from File 4)
                    if len(ground_truth) > 100000: # Transcript usually < 100kb. 1.6MB is suspicious.
                        # Simple check for null bytes
                        if "\0" in ground_truth[:100]: 
                             print(f"   ⚠️ Skipping Text File: Seems binary/corrupt ({len(ground_truth)} bytes).")
                             ground_truth = ""
            except Exception as e:
                print(f"   ⚠️ Error reading text file: {e}")
        else:
            print(f"   ⚠️ Missing ground truth file: {text_filename}")

        if not ground_truth:
            results.append({
                "file": filename,
                "accuracy": 0.0,
                "status": "MISSING_TRUTH",
                "length": 0
            })
            continue

        # 3. Transcribe
        try:
             # Need to use abs path for AssemblyAI sometimes if not in subfolder
             abs_audio_path = os.path.abspath(audio_path)
             transcript_res = await AssemblyAIService.transcribe_audio_async(abs_audio_path, redact_pii=False)
             generated_text = transcript_res["text"]
        except Exception as e:
            print(f"   ❌ STT Error: {e}")
            results.append({
                "file": filename,
                "accuracy": 0.0,
                "status": "STT_ERROR",
                "length": len(ground_truth)
            })
            continue

        # 4. Compare
        # Accuracy % = SequenceMatcher ratio * 100
        matcher = SequenceMatcher(None, ground_truth, generated_text)
        accuracy = matcher.ratio() * 100
        
        print(f"   ✅ Done. Accuracy: {accuracy:.2f}%")
        
        results.append({
            "file": filename,
            "accuracy": accuracy,
            "status": "OK",
            "length": len(ground_truth),
            "generated_len": len(generated_text)
        })

    # 5. Generate Table
    print("\n\n### 📉 Comparison Results Table")
    print("| Audio File | Status | Ground Truth Length | Generated Length | Accuracy (%) |")
    print("| :--- | :--- | :--- | :--- | :--- |")
    
    total_acc = 0
    count = 0
    
    for r in results:
        status_icon = "✅" if r["accuracy"] > 80 else "⚠️" if r["accuracy"] > 50 else "❌"
        if r["status"] != "OK": status_icon = "🚫"
        
        print(f"| {r['file']} | {status_icon} {r['status']} | {r['length']} chars | {r.get('generated_len', 0)} chars | **{r['accuracy']:.2f}%** |")
        
        if r["status"] == "OK":
            total_acc += r["accuracy"]
            count += 1
            
    if count > 0:
        avg = total_acc / count
        print(f"\n**Average Accuracy across {count} files: {avg:.2f}%**")

if __name__ == "__main__":
    asyncio.run(run_comparison())
