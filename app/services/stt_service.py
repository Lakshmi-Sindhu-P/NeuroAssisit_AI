import assemblyai as aai
import asyncio
from app.core.config import settings

# Configure global API key
aai.settings.api_key = settings.ASSEMBLYAI_API_KEY


class AssemblyAIService:
    @staticmethod
    async def transcribe_audio_async(file_path: str, redact_pii: bool = True) -> dict:
        """
        Asynchronously transcribes audio using AssemblyAI (correct SDK usage).
        Supports diarization, PII redaction, medical vocabulary boosting.
        """

        transcriber = aai.Transcriber()

        config = aai.TranscriptionConfig(
            speaker_labels=True,
            speakers_expected=2,
            redact_pii=redact_pii,
            redact_pii_policies=[
                aai.PIIRedactionPolicy.person_name,
                aai.PIIRedactionPolicy.phone_number,
            ],
            language_code="en_us",
            punctuate=True,
            format_text=True,
            word_boost=[
                "Levetiracetam",
                "Donepezil",
                "Carbamazepine",
                "Sumatriptan",
                "Topiramate",
                "Valproate",
                "Gabapentin",
                "Memantine"
            ],
            boost_param="high"
        )

        loop = asyncio.get_event_loop()
        transcript = await loop.run_in_executor(
            None,
            lambda: transcriber.transcribe(file_path, config=config)
        )

        if transcript.status == aai.TranscriptStatus.error:
            raise Exception(transcript.error)

        return {
            "text": transcript.text,
            "transcript": transcript.text,  # frontend compatibility
            "utterances": [
                {
                    "speaker": u.speaker,
                    "text": u.text,
                    "start": u.start,
                    "end": u.end
                } for u in transcript.utterances
            ] if transcript.utterances else [],
            "confidence": transcript.confidence,
            "id": transcript.id
        }
