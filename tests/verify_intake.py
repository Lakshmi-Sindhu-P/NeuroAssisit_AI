import asyncio
import os
from dotenv import load_dotenv
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.services.llm_service import GeminiService

async def test_intake_summary():
    load_dotenv()
    
    # Sample transcript from a nurse intake
    transcript = """
    Nurse: Hello Mr. Smith, I understand you're here for your follow-up. How have you been feeling since the last visit?
    Patient: Well, the headaches are back. They've been quite sharp, mostly on the left side.
    Nurse: I'm sorry to hear that. When did they start getting worse?
    Patient: About Three days ago. It feels like a throbbing pressure.
    Nurse: On a scale of 1 to 10, how would you rate the pain?
    Patient: It's an 8 today. I also noticed some blurry vision this morning.
    Nurse: That's important. Have you taken any medication for it?
    Patient: Just some Ibuprofen, but it didn't help much.
    Nurse: Okay, I'll make a note of the vision changes and the pain level for Dr. Taylor.
    """
    
    print("\n--- Testing Intake Summary ---")
    print("Transcript Length:", len(transcript))
    
    try:
        summary = await GeminiService.generate_intake_summary(transcript)
        print("\nGenerated Summary:")
        print(f"\"{summary}\"")
        
        if len(summary) > 0:
            print("\n✅ SUCCESS: Summary generated successfully.")
        else:
            print("\n❌ FAILED: Summary is empty.")
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_intake_summary())
