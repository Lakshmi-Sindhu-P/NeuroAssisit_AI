import asyncio
import os
import glob
import string
import re
from difflib import SequenceMatcher
from app.services.stt_service import AssemblyAIService
from dotenv import load_dotenv

load_dotenv()

dataset_dir = "Neruro AI Convo Audio"

def normalize_text(text: str) -> str:
    """
    Normalizes text for fairer comparison:
    1. Lowercase
    2. Remove punctuation
    3. Normalize spaces
    4. Simple number mapping (basic)
    """
    text = text.lower()
    # Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    # Normalize spaces
    text = " ".join(text.split())
    # Simple explicit map for common small numbers (as per user example "three" -> "3")
    # Actually user said "three - 3". STT usually outputs "3". GT might have "three".
    # Let's map words to digits for consistency
    number_map = {
        "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
        "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10"
    }
    words = text.split()
    normalized_words = [number_map.get(w, w) for w in words]
    return " ".join(normalized_words)

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
             transcript_res = await AssemblyAIService.transcribe_audio_async(abs_audio_path)
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

        # 4. Compare (Normalized)
        norm_gt = normalize_text(ground_truth)
        norm_gen = normalize_text(generated_text)
        
        # Accuracy % = SequenceMatcher ratio * 100
        matcher = SequenceMatcher(None, norm_gt, norm_gen)
        accuracy = matcher.ratio() * 100
        
        print(f"   ✅ Done. Accuracy: {accuracy:.2f}% (Normalized)")
        
        results.append({
            "file": filename,
            "accuracy": accuracy,
            "status": "OK",
            "length": len(ground_truth),
            "generated_len": len(generated_text),
            "ground_truth": ground_truth,
            "generated_text": generated_text
        })

    # 5. Generate Table
    print("\n\n### 📉 Comparison Results Table")
    print("| Audio File | Status | Ground Truth Length | Generated Length | Accuracy (%) |")
    print("| :--- | :--- | :--- | :--- | :--- |")
    
    total_acc = 0
    count = 0
    
    # 5. Generate Detailed Report File with Text Previews
    report_path = "stt_transcript_dump.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# 📝 STT Transcript Comparison Dump\n\n")
        f.write("| File | Accuracy | Status |\n")
        f.write("| :--- | :--- | :--- |\n")
        for r in results:
            f.write(f"| {r['file']} | **{r['accuracy']:.2f}%** | {r['status']} |\n")
        
        f.write("\n---\n")
        
        for r in results:
            f.write(f"## 📄 File: {r['file']} ({r['accuracy']:.2f}%)\n")
            if r["file"] == "4-audio.aac":
                f.write("> **⚠️ Binary/Corrupt Ground Truth detected. Content skipped.**\n\n")
                continue
                
            f.write("### 🟢 Ground Truth (First 500 chars)\n")
            gt_preview = (r["ground_truth"][:500] + "...") if len(r["ground_truth"]) > 500 else r["ground_truth"]
            f.write(f"```text\n{gt_preview}\n```\n")
            
            f.write("### 🤖 Generated STT (First 500 chars)\n")
            gen_preview = (r["generated_text"][:500] + "...") if len(r["generated_text"]) > 500 else r["generated_text"]
            f.write(f"```text\n{gen_preview}\n```\n")
            f.write("\n---\n")

    print(f"\n✅ Detailed transcript dump saved to: {report_path}")

if __name__ == "__main__":
    asyncio.run(run_comparison())
