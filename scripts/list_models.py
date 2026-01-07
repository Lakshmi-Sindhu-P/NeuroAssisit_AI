import google.generativeai as genai
import os
from app.core.config import settings

# Configure API Key
genai.configure(api_key=settings.GOOGLE_API_KEY)

print("Listing available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error listing models: {e}")
