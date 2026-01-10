from app.models.base import TriageCategory, SOAPNote, PatientProfile
from typing import Dict, Any, Tuple, Optional

# Critical keywords that indicate emergency conditions
# These MUST trigger CRITICAL triage status
CRITICAL_KEYWORDS = [
    # Stroke/Neurological
    "stroke",
    "brain stroke",
    "paralysis",
    "left side weakness",
    "right side weakness",
    "vision loss",
    "slurred speech",
    "sudden numbness",
    "face drooping",
    "arm weakness",
    "seizure",
    "fits",
    "convulsion",
    "unconscious",
    "unresponsive",
    
    # Cardiac
    "heart attack",
    "chest pain",
    "chest tightness",
    "crushing chest pain",
    "cardiac arrest",
    
    # Respiratory
    "breathing difficulty",
    "can't breathe",
    "cannot breathe",
    "shortness of breath",
    "severe breathing",
    "choking",
    
    # Other Critical
    "suicide",
    "harm myself",
    "abuse",
    "severe bleeding",
    "head injury",
    "loss of consciousness",
]

HIGH_KEYWORDS = [
    "severe pain",
    "high fever",
    "fainting",
    "dizziness",
    "blurred vision",
    "numbness",
    "weakness",
    "difficulty walking",
    "confusion",
    "memory loss",
]

MODERATE_KEYWORDS = [
    "pain",
    "fever",
    "headache",
    "migraine",
    "vomiting",
    "nausea",
    "diarrhea",
    "infection",
    "rash",
    "cough",
]


class TriageService:
    
    @staticmethod
    def evaluate_transcript(transcript: str) -> Dict[str, Any]:
        """
        Evaluate raw transcript text for critical keywords.
        This is the PRIMARY triage method for symptom recordings.
        Runs IMMEDIATELY after speech-to-text completes.
        
        Returns:
            dict with triage_status, risk_score, reason, triage_source
        """
        if not transcript:
            return {
                "triage_status": TriageCategory.LOW,
                "risk_score": 10,
                "reason": "No transcript provided",
                "triage_source": "AI"
            }
        
        transcript_lower = transcript.lower()
        
        # Check for CRITICAL keywords first
        for keyword in CRITICAL_KEYWORDS:
            if keyword in transcript_lower:
                return {
                    "triage_status": TriageCategory.CRITICAL,
                    "risk_score": 95,
                    "reason": f"Detected critical phrase: '{keyword}'",
                    "triage_source": "AI"
                }
        
        # Check for HIGH urgency keywords
        for keyword in HIGH_KEYWORDS:
            if keyword in transcript_lower:
                return {
                    "triage_status": TriageCategory.HIGH,
                    "risk_score": 75,
                    "reason": f"Detected high urgency phrase: '{keyword}'",
                    "triage_source": "AI"
                }
        
        # Check for MODERATE keywords
        for keyword in MODERATE_KEYWORDS:
            if keyword in transcript_lower:
                return {
                    "triage_status": TriageCategory.MODERATE,
                    "risk_score": 50,
                    "reason": f"Detected moderate symptom: '{keyword}'",
                    "triage_source": "AI"
                }
        
        # Default to LOW
        return {
            "triage_status": TriageCategory.LOW,
            "risk_score": 20,
            "reason": "No critical symptoms detected",
            "triage_source": "AI"
        }
    
    @staticmethod
    def calculate_urgency(soap_note: SOAPNote, patient_profile: PatientProfile) -> Tuple[int, TriageCategory]:
        """
        Calculates urgency score (0-100) and category based on SOAP note content and risk flags.
        This is a SECONDARY triage method, used after AI processing.
        """
        score = 0
        
        # risk_flags is stored as {"flags": ["Risk1", "Risk2"]}
        risk_data = soap_note.risk_flags or {}
        risk_flags_list = risk_data.get("flags", []) if isinstance(risk_data, dict) else []
        soap_json = soap_note.soap_json or {}
        
        subjective = soap_json.get("subjective", "").lower()
        assessment = soap_json.get("assessment", "").lower()
        
        # 1. Critical Risk Flags (Suicide, Abuse, Severe Distress)
        for flag in risk_flags_list:
            if any(k in flag.lower() for k in CRITICAL_KEYWORDS):
                score = 95
                return score, TriageCategory.CRITICAL
        
        # Check textual content for critical keywords
        combined_text = subjective + " " + assessment
        for keyword in CRITICAL_KEYWORDS:
            if keyword in combined_text:
                score = 90
                return score, TriageCategory.CRITICAL
 
        # 2. High Urgency
        for keyword in HIGH_KEYWORDS:
            if keyword in combined_text:
                score = 75
                return score, TriageCategory.HIGH
 
        # 3. Moderate Urgency
        for keyword in MODERATE_KEYWORDS:
            if keyword in combined_text:
                score = 50
                return score, TriageCategory.MODERATE
 
        # 4. Low Urgency (Default)
        score = 20
        return score, TriageCategory.LOW
