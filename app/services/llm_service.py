import google.generativeai as genai
import json
import asyncio
from typing import List, Dict, Any
from app.core.config import settings

# Configure global API key
genai.configure(api_key=settings.GOOGLE_API_KEY)

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log
import logging

logger = logging.getLogger(__name__)

class GeminiService:
    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=4, max=30),
        reraise=True
    )
    async def generate_clinical_document(document_type: str, soap_note: Dict[str, Any], patient_context: Dict[str, Any]) -> str:
        """
        Generates a clinical document (referral, certificate, etc.) based on the SOAP note.
        """
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        You are an expert medical administrative assistant.
        Draft a professional **{document_type}** based on the following consultation details.
        
        Patient: {patient_context.get('first_name')} {patient_context.get('last_name')} (Age: {patient_context.get('age')})
        
        SOAP Note Context:
        Subjective: {soap_note.get('subjective')}
        Objective: {soap_note.get('objective')}
        Assessment: {soap_note.get('assessment')}
        Plan: {soap_note.get('plan')}
        
        Requirements:
        1. Use standard medical letter format.
        2. Be concise but complete.
        3. Include placeholders for [Date] or [Doctor Name] if not provided.
        4. Return ONLY the text of the document, no markdown formatting blocks.
        """
        
        response = await model.generate_content_async(prompt)
        return response.text.strip()

    @staticmethod
    @retry(
        stop=stop_after_attempt(5), # Increased attempts for quota
        wait=wait_exponential(multiplier=2, min=4, max=60), # Exponential backoff: 4s, 8s, 16s, 32s, 60s
        reraise=True
    )
    async def generate_soap_note_async(transcript_text: str, speaker_labels: List[Dict[str, Any]] = None, patient_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generates a structured SOAP note from the transcript using Gemini.
        Returns a dictionary matching the SOAP note schema.
        Includes robust retry logic for 429 Quota errors.
        """
        # Construct a speaker-aware transcript if labels are provided
        formatted_transcript = transcript_text
        if speaker_labels:
            formatted_lines = []
            for utter in speaker_labels:
                 # utter is expected to be a dict like {'speaker': 'A', 'text': '...', ...}
                 speaker = utter.get('speaker', 'Unknown')
                 text = utter.get('text', '')
                 formatted_lines.append(f"Speaker {speaker}: {text}")
            formatted_transcript = "\n".join(formatted_lines)
            
        # Format Patient Context for Prompt
        context_str = "Unknown"
        if patient_context:
            context_str = (
                f"Name: {patient_context.get('first_name', '')} {patient_context.get('last_name', '')}\n"
                f"Age: {patient_context.get('age', 'N/A')}\n"
                f"Gender: {patient_context.get('gender', 'N/A')}\n"
                f"Medical History/Notes: {patient_context.get('notes', 'None provided')}"
            )
            
        # Initialize Model (Gemini 1.5 Flash - Verified & Requested)
        model = genai.GenerativeModel(
            'gemini-1.5-flash',
            generation_config={"response_mime_type": "application/json"}
        )
        
        prompt = f"""
        You are an expert medical scribe. Your task is to analyze the following Doctor-Patient consultation transcript and generate a HIGHLY DETAILED, professional SOAP note encoded as JSON.
        
        Patient Context:
        {context_str}
        
        Transcript:
        {formatted_transcript}
        
        Instructions:
        1. **Subjective**: COMPREHENSIVE narrative. Use a mix of paragraphs for history and BULLET POINTS for specific symptom lists.
        2. **Objective**: Detailed observations. Use BULLET POINTS for findings.
        3. **Assessment**: Detailed reasoning. Use text for explanation and BULLET POINTS for differential diagnoses.
        4. **Plan**: Detailed steps. Use BULLET POINTS for each medication/instruction.
        5. **STRICT GROUNDING**: Do NOT invent information.
        6. **Style**: Comprehensive but structured. Easy to scan.
        7. **Format**: Return STRICTLY valid JSON.
        8. **UI Summaries**: Create ULTRA-CONCISE drafts for the UI fields.
           - **Diagnosis**: FINAL CONFIRMED DIAGNOSIS or PRIMARY WORKING IMPRESSION only. Do NOT list ruled-out differentials. Separated by ' | '.
           - **Prescription**: KEYWORDS (Medication Name, Dose, Freq).
           - **Notes**: MUST BE EMPTY STRING "".
        9. **Demographics Extraction**: Extract if mentioned.
        
        Required JSON Structure:
        {{
            "soap_note": {{
                "subjective": "Patient presents with...\\n- Symptom A\\n- Symptom B...",
                "objective": "- BP 120/80\\n- Clear lungs",
                "assessment": "The clinical picture suggests...\\n- Differential 1",
                "plan": "- Med X 500mg\\n- Follow up 2w"
            }},
            "ui_summary": {{
                "diagnosis": "- Condition A",
                "prescription": "- Med X 500mg BID\\n- MRI Brain",
                "notes": "" 
            }},
            "demographics": {{
                "age": 45, 
                "gender": "Male" 
            }},
            "low_confidence": ["list", "of", "ambiguous", "terms"],
            "risk_flags": ["Risk 1", "Risk 2"] 
        }}
        """

        
        # Offload the blocking API call to a thread
        loop = asyncio.get_event_loop()
        
        try:
            print("   (Gemini) Sending request...")
            response = await loop.run_in_executor(
                None, 
                lambda: model.generate_content(prompt)
            )
        except Exception as e:
            # Check for quota errors to print explicit warning (Tenacity handles the retry)
            if "429" in str(e) or "quota" in str(e).lower() or "resource exhausted" in str(e).lower():
                print(f"   ⚠️ Quota Limit Hit (429). Retrying in background...")
            raise e
        
        try:
            # Parse JSON result
            result_json = json.loads(response.text)
            return result_json
        except json.JSONDecodeError:
            # Fallback if strict JSON fails (rare with response_mime_type set)
            print(f"JSON Decode Error. Raw response: {response.text}")
            # Attempt to clean potential markdown
            cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
            try:
                return json.loads(cleaned_text)
            except:
                 raise Exception("Failed to generate valid JSON SOAP note")
        except Exception as e:
            raise Exception(f"Gemini generation failed: {str(e)}")

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=4, max=30),
        reraise=True
    )
    async def generate_prescription_digitization(image_path: str) -> Dict[str, Any]:
        """
        Analyzes a medical prescription image using Gemini Vision to extract structured medication data.
        """
        try:
            # Load the image
            # Gemini 1.5/2.5 Flash supports image inputs directly via path or bytes
            # We'll use the file API for safety or direct upload object if needed, 
            # but for simplicity/speed with local files, we can upload to File API or pass data.
            # python-generativeai allows passing PIL images or path objects.
            
            # Note: For efficient handling, 'genai.upload_file' is recommended for larger media, 
            # but for single page Rx, we can check library support. 
            # Let's use the File API which is standard for recent Gemini versions.
            
            print(f"   (Gemini) Uploading file for vision analysis: {image_path}")
            uploaded_file = genai.upload_file(image_path)
            
            model = genai.GenerativeModel('gemini-2.0-flash-exp') # Or 1.5-flash if 2.5 not available yet via standard key in this env

            prompt = "Analyze this prescription and extract medications in JSON."
            
            # Offload blocking call
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content([prompt, uploaded_file])
            )
            
            # Clean up file? (Optional but good practice if API allows, though usually auto-managed or small quota)
            
            try:
                text = response.text.replace("```json", "").replace("```", "").strip()
                return json.loads(text)
            except:
                return {"raw_text": response.text, "error": "Failed to parse JSON"}
                
        except Exception as e:
            logger.error(f"Prescription OCR failed: {e}")
            raise e
