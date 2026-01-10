"""
Transcription Router - Standalone Speech-to-Text endpoint
Uses AssemblyAI for transcription without requiring a consultation ID
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.api.deps import get_current_user
from app.models.base import User
from app.services.stt_service import AssemblyAIService
import os
import uuid
import shutil

router = APIRouter()

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/speech-to-text")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Standalone speech-to-text transcription endpoint.
    Accepts audio file and returns transcribed text.
    Used for symptom recording during appointment booking.
    """
    # Validate file format
    valid_extensions = ('.wav', '.mp3', '.m4a', '.aac', '.webm', '.ogg')
    if not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file format. Supported: {', '.join(valid_extensions)}"
        )
    
    # Save file temporarily
    file_id = str(uuid.uuid4())[:8]
    file_ext = os.path.splitext(file.filename)[1] or '.webm'
    temp_filename = f"temp_stt_{file_id}{file_ext}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)
    
    try:
        # Save uploaded file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Transcribe using AssemblyAI
        result = await AssemblyAIService.transcribe_audio_async(temp_path, redact_pii=False)
        
        return {
            "text": result.get("text", ""),
            "transcript": result.get("text", ""),  # Alias for frontend compatibility
            "confidence": result.get("confidence"),
            "utterances": result.get("utterances", [])
        }
        
    except Exception as e:
        print(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
