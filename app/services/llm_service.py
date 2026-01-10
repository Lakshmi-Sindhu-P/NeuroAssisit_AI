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
    async def generate_intake_summary(transcript_text: str) -> str:
        """
        Generates a concise (2-3 sentence) summary of the pre-visit intake transcription.
        """
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        You are an expert medical scribe assisting a Neurologist.
        Summarize the following patient intake conversation (conducted by a nurse or front-desk) into 2-3 concise sentences.
        Focus on:
        1. Primary complaint/reason for visit.
        2. Key duration or severity details mentioned.
        3. Any urgent red flags identified.

        Transcript:
        {transcript_text}

        Summary:
        """
        
        # Offload the blocking API call to a thread
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: model.generate_content(prompt)
        )
        return response.text.strip()

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
        model = genai.GenerativeModel('gemini-2.5-flash')
        
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
        if settings.USE_MOCK_AI:
            print("   [MOCK] Returning simulation SOAP note...")
            await asyncio.sleep(2)
            return {
                "soap_note": {
                    "subjective": "Patient reports feeling better than yesterday. Confirmed hearing the doctor clearly.",
                    "objective": "- Alert and oriented x3\n- Speech clear",
                    "assessment": "Improving status post recent consultation.",
                    "plan": "- Continue current care plan\n- Follow up as needed"
                },
                "ui_summary": {
                    "diagnosis": "General Checkup",
                    "prescription": "None",
                    "notes": ""
                },
                "demographics": {},
                "low_confidence": [],
                "risk_flags": []
            }
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
            
        # Initialize Model (Gemini 2.5 Flash)
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
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
    async def transcribe_audio_with_diarization(audio_file_path: str) -> Dict[str, Any]:
        """
        Transcribes audio using Gemini 2.0 Flash with advanced speaker diarization (Doctor vs Patient).
        Output includes a plain text transcript and a structured list of utterances.
        """
        try:
            if settings.USE_MOCK_AI:
                print("   [MOCK] Returning simulation transcript...")
                await asyncio.sleep(2) # Simulate latency
                return {
                    "full_transcript": "Doctor: Check check. Is this recording?\nPatient: Yes, I can hear you.\nDoctor: Great. How are you feeling today?\nPatient: Better than yesterday.",
                    "utterances": [
                         {"speaker": "Doctor", "text": "Check check. Is this recording?", "start": 0.0, "end": 2.5},
                         {"speaker": "Patient", "text": "Yes, I can hear you.", "start": 2.6, "end": 4.0},
                         {"speaker": "Doctor", "text": "Great. How are you feeling today?", "start": 4.1, "end": 6.5},
                         {"speaker": "Patient", "text": "Better than yesterday.", "start": 6.6, "end": 8.0}
                    ]
                }
            
            print(f"   (Gemini) Uploading audio for transcription: {audio_file_path}")
            # Upload the audio file to Gemini
            uploaded_file = genai.upload_file(audio_file_path)
            
            # Wait for processing to complete (usually instant for small files, but good practice)
            import time
            while uploaded_file.state.name == "PROCESSING":
                print("   (Gemini) Waiting for file processing...")
                time.sleep(1)
                uploaded_file = genai.get_file(uploaded_file.name)
            
            if uploaded_file.state.name == "FAILED":
                raise Exception("Audio file processing failed on Gemini server.")

            # Upgrade to Gemini 2.5 Flash for initial transcription as well
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )
            
            prompt = """
            You are an expert medical transcriptionist.
            Transcribe the following audio consultation between a Doctor and a Patient.
            
            Your tasks:
            1. **Identify Speakers**: Accurately label speakers as "Doctor", "Patient", or others (e.g., "Nurse", "Caregiver").
            2. **Verbatim Transcription**: Transcribe the conversation word-for-word.
            3. **Format**: Return a JSON object with the full transcript and list of utterances.
            
            Required JSON Structure:
            {
                "full_transcript": "Doctor: Hello... \\nPatient: Hi...",
                "utterances": [
                    {"speaker": "Doctor", "text": "Hello, how are you?", "start": 0.0, "end": 2.5},
                    {"speaker": "Patient", "text": "I am not feeling well.", "start": 2.6, "end": 4.0}
                ]
            }
            """
            
            # Offload blocking call
            loop = asyncio.get_event_loop()
            print("   (Gemini) Sending transcription request...")
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content([prompt, uploaded_file])
            )
            
            # Parse result
            try:
                result_json = json.loads(response.text)
                return result_json
            except json.JSONDecodeError:
                # Cleanup attempt
                text = response.text.replace("```json", "").replace("```", "").strip()
                return json.loads(text)
                
        except Exception as e:
            logger.error(f"Gemini Transcription failed: {e}")
            raise e

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=4, max=30),
        reraise=True
    )
    async def refine_transcript_diarization(transcript_text: str, utterances: List[Dict[str, Any]]) -> str:
        """
        Takes a raw transcript with speaker labels (Speaker A, Speaker B) and uses Gemini 
        to infer who is the Doctor and who is the Patient based on context.
        Returns a formatted string: "Doctor: ... \n Patient: ..."
        """
        if settings.USE_MOCK_AI:
            return "Doctor: Mock Doctor text.\nPatient: Mock Patient text."

        # 1. Format raw conversation for the prompt
        raw_conversation = ""
        for u in utterances:
            speaker_label = u.get("speaker", "Unknown")
            raw_conversation += f"Speaker {speaker_label}: {u.get('text', '')}\n"

        # Use Gemini 2.5 Flash as requested for better label segmentation
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        You are an expert medical transcription editor. 
        Your task is to take a raw transcript with IMPERFECT speaker separation and fix it.
        The conversion often merges the Doctor and Patient into a single block, or mislabels them (e.g., Speaker A asking a question AND answering it).

        Your Goals:
        1. **Identify Roles**: accurately label "Doctor" vs "Patient" based on *what* is said (Doctor asks, Patient answers/complains).
        2. **Semantic Splitting**: If a single block contains multiple turns (e.g., "How old are you? I'm 29"), **SPLIT** it into separate lines with correct labels.
        3. **Correction**: Even if the input says "Speaker A" said everything, if the content clearly switches from Doctor to Patient, split it.

        Rules:
        - **Doctor**: Asks medical questions, gives instructions, prescribes med.
        - **Patient**: Reports symptoms, answers queries, expresses pain/concern.
        - **Format**:
            **Doctor:** [Text]
            
            **Patient:** [Text]
        - **STRICT VALIDITY**: Do NOT change the words spoken. Only fix the speakers and line breaks. Do not summarize.

        Raw Transcript:
        {raw_conversation}
        
        Formatted Transcript:
        """
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: model.generate_content(prompt)
        )
        return response.text.strip()

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=4, max=30),
        reraise=True
    )
    async def check_drug_interactions_async(current_meds: str, new_prescription: str) -> List[Dict[str, str]]:
        """
        Analyzes potential drug interactions between current medications and new prescriptions using Gemini.
        Returns a list of warnings.
        """
        if settings.USE_MOCK_AI:
            return [{
                "type": "CONTRAINDICATION",
                "message": "Mock Warning: Potential interaction detected.",
                "drug": "Mock Drug",
                "condition": "Mock Condition"
            }]

        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config={"response_mime_type": "application/json"}
        )
        
        prompt = f"""
        You are an expert Clinical Pharmacist and AI Safety Guardrail.
        Analyze the following medication list for potential Drug-Drug Interactions (DDIs) or Drug-Condition Contraindications.

        Patient Current Medications/History:
        {current_meds}

        New Prescription Attempt:
        {new_prescription}

        Task:
        1. Identify any **MAJOR** or **MODERATE** interactions.
        2. Ignore minor interactions unless critical.
        3. Return a JSON list of warnings.

        Required JSON Structure:
        [
            {{
                "type": "CONTRAINDICATION" | "WARNING",
                "message": "Clear explanation of the risk (e.g., Risk of Serotonin Syndrome).",
                "drug": "Name of the drug causing issue",
                "severity": "HIGH" | "MODERATE"
            }}
        ]
        
        If no interactions, return empty list [].
        """
        
        loop = asyncio.get_event_loop()
        try:
            print("   (Gemini) Checking Drug Interactions...")
            response = await loop.run_in_executor(
                None, 
                lambda: model.generate_content(prompt)
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Safety Check Failed: {e}")
            return [] # Fail safe: return no warnings rather than blocking, or handle upstream

