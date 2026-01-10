class DocumentGenerationRequest(BaseModel):
    document_type: str  # "medical_certificate", "referral_letter", "clinical_summary"

@router.post("/{id}/generate-document", response_model=Dict[str, str])
async def generate_document(
    id: UUID,
    payload: DocumentGenerationRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.FRONT_DESK]))
):
    consultation = session.get(Consultation, id)
    if not consultation:
         raise HTTPException(status_code=404, detail="Consultation not found")

    if not consultation.soap_note:
         raise HTTPException(status_code=400, detail="SOAP Note must be generated first")
         
    # Fetch Patient
    patient = session.get(User, consultation.patient_id)
    if not patient:
         raise HTTPException(status_code=404, detail="Patient not found")
         
    # Build Context
    patient_context = {
        "first_name": "Unknown",
        "last_name": "",
        "age": "N/A"
    }
    if patient.patient_profile:
        patient_context["first_name"] = patient.patient_profile.first_name
        patient_context["last_name"] = patient.patient_profile.last_name
        # Calc age if dob exists, else N/A
    
    soap_dict = {
        "subjective": consultation.soap_note.subjective,
        "objective": consultation.soap_note.objective,
        "assessment": consultation.soap_note.assessment,
        "plan": consultation.soap_note.plan
    }

    try:
        from app.services.llm_service import GeminiService
        generated_text = await GeminiService.generate_clinical_document(
            payload.document_type,
            soap_dict,
            patient_context
        )
        return {"content": generated_text}
    except Exception as e:
        print(f"Doc Gen Error: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
