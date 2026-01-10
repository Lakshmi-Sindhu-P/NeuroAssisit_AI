from app.services.llm_service import GeminiService
from app.models.base import SOAPNote, PatientProfile
from typing import List, Dict
import json

class SafetyService:
    @staticmethod
    async def check_drug_interactions(soap_note: SOAPNote, patient_profile: PatientProfile) -> List[Dict[str, str]]:
        """
        Analyzes the Treatment Plan against Patient History for potential contraindications.
        Returns a list of warnings.
        """
        soap_json = soap_note.soap_json or {}
        plan_text = soap_json.get("plan", "").lower()
        
        # Prepare Inputs for AI
        current_meds = patient_profile.current_medications or patient_profile.medical_history or "None listed"
        new_prescription = plan_text
        
        if not new_prescription:
            return []

        # Use Gemini for Analysis
        warnings = await GeminiService.check_drug_interactions_async(current_meds, new_prescription)
        return warnings
