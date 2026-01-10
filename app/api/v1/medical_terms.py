from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import MedicalTerm, MedicalTermCategory, User, UserRole
from app.api.deps import get_current_user
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

router = APIRouter()

# Schema for creating a term
class MedicalTermCreate(BaseModel):
    term: str
    category: MedicalTermCategory
    description: Optional[str] = None

class MedicalTermRead(BaseModel):
    id: UUID
    term: str
    category: MedicalTermCategory
    description: Optional[str] = None
    created_at: datetime

@router.get("/", response_model=List[MedicalTermRead])
def get_medical_terms(
    category: Optional[MedicalTermCategory] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get all medical terms. Accessible by all authenticated users.
    Optionally filter by category.
    """
    query = select(MedicalTerm)
    if category:
        query = query.where(MedicalTerm.category == category)
    query = query.order_by(MedicalTerm.term.asc())
    return session.exec(query).all()

@router.post("/", response_model=MedicalTermRead)
def create_medical_term(
    term_data: MedicalTermCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new medical term.
    Only DOCTORS can add terms.
    """
    if current_user.role != UserRole.DOCTOR and current_user.role != UserRole.MASTER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can add medical terms."
        )
    
    # Check duplicate
    existing = session.exec(select(MedicalTerm).where(MedicalTerm.term == term_data.term)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Term '{term_data.term}' already exists."
        )

    term = MedicalTerm(
        term=term_data.term,
        category=term_data.category,
        description=term_data.description,
        added_by_id=current_user.id
    )
    session.add(term)
    session.commit()
    session.refresh(term)
    return term

@router.delete("/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medical_term(
    term_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a medical term.
    Only DOCTORS can delete terms.
    """
    if current_user.role != UserRole.DOCTOR and current_user.role != UserRole.MASTER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can delete medical terms."
        )

    term = session.get(MedicalTerm, term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Medical term not found")

    session.delete(term)
    session.commit()
