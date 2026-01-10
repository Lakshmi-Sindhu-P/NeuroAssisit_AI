import google.generativeai as genai
import os
from app.core.config import settings

# Configure API Key
genai.configure(api_key=settings.GOOGLE_API_KEY)

def test_model(model_name):
    print(f"Testing model: {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello, can you hear me?")
        print(f"✅ Success! Response: {response.text}")
        return True
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False

if __name__ == "__main__":
    # Test 2.5 Flash as requested
    if not test_model("gemini-2.5-flash"):
        print("\nFallback Testing:")
        test_model("gemini-1.5-flash")
