import random
from datetime import datetime, timedelta
from uuid import uuid4
from sqlmodel import Session, select, SQLModel
from app.core.db import engine
from app.models.base import (
    User, UserRole, PatientProfile, Consultation, ConsultationStatus, 
    Appointment, AppointmentStatus, TriageCategory, DoctorProfile
)
from app.core.security import get_password_hash

def seed_data():
    print("🌱 Seeding Demo Data...")
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. Get or Create Doctor
        doctor_email = "dr.smith@neuro.com"
        doctor = session.exec(select(User).where(User.email == doctor_email)).first()
        if not doctor:
            doctor = User(
                email=doctor_email,
                password_hash=get_password_hash("password123"),
                role=UserRole.DOCTOR
            )
            session.add(doctor)
            session.commit()
            session.refresh(doctor)
            
            doc_profile = DoctorProfile(
                user_id=doctor.id, 
                first_name="John", last_name="Smith",
                specialization="Neurology"
            )
            session.add(doc_profile)
            session.commit()

        # 2. Create Patients
        patients_data = [
            ("John", "Doe", "Severe Migraine", TriageCategory.HIGH, 85),
            ("Alice", "Smith", "Dizziness", TriageCategory.MODERATE, 60),
            ("Bob", "Brown", "Routine Checkup", TriageCategory.LOW, 30),
            ("Emma", "Davis", "Slurred Speech", TriageCategory.CRITICAL, 95),
            ("Michael", "Wilson", "Back Pain", TriageCategory.LOW, 40)
        ]
        
        created_patients = []
        for first, last, condition, triage, risk in patients_data:
            email = f"{first.lower()}.{last.lower()}@example.com"
            user = session.exec(select(User).where(User.email == email)).first()
            if not user:
                user = User(
                    email=email,
                    password_hash=get_password_hash("password"),
                    role=UserRole.PATIENT
                )
                session.add(user)
                session.commit()
                session.refresh(user)
                
                profile = PatientProfile(
                    user_id=user.id,
                    first_name=first,
                    last_name=last,
                    date_of_birth=datetime(1980, 1, 1),
                    gender="Male" if first in ["John", "Bob", "Michael"] else "Female",
                    medical_history=f"History of {condition}. Allergies: None."
                )
                session.add(profile)
                session.commit()
            
            created_patients.append(user)

        # 3. Create Consultations (Queue Population)
        
        # Case 1: Critical Patient (Emma) - Waiting
        appt1 = Appointment(
            patient_id=created_patients[3].id, doctor_id=doctor.id,
            scheduled_at=datetime.utcnow(), status=AppointmentStatus.CHECKED_IN
        )
        session.add(appt1)
        session.commit()
        session.refresh(appt1)
        
        cons1 = Consultation(
            appointment_id=appt1.id, patient_id=appt1.patient_id, doctor_id=appt1.doctor_id,
            status=ConsultationStatus.COMPLETED, # Using COMPLETED as "Ready for Review/Queue" based on backend logic usually (or SCHEDULED)
            # Actually dashboard.py /queue queries for COMPLETED?? Check logic.
            # Re-reading dashboard.py: 
            # .where(Consultation.status == ConsultationStatus.COMPLETED) -> Logic seems odd?
            # Usually Queue is for IN_PROGRESS or WAITING. 
            # Let's assume logic requires COMPLETED status for "Triage Complete -> Ready for Doctor"?
            # Yes, Triage Service completes the "Triage" phase.
            urgency_score=95, triage_category=TriageCategory.CRITICAL,
            created_at=datetime.utcnow() - timedelta(minutes=10),
            safety_warnings=[{"type": "CAUTION", "message": "Risk of Stroke", "drug": "", "condition": ""}],
            risk_flags=["Potential Stroke", "High Urgency"]
        )
        session.add(cons1)
        
        # Case 2: Moderate Patient (Alice) - Waiting
        appt2 = Appointment(
            patient_id=created_patients[1].id, doctor_id=doctor.id,
            scheduled_at=datetime.utcnow(), status=AppointmentStatus.CHECKED_IN
        )
        session.add(appt2)
        session.commit()
        session.refresh(appt2)

        cons2 = Consultation(
            appointment_id=appt2.id, patient_id=appt2.patient_id, doctor_id=appt2.doctor_id,
            status=ConsultationStatus.COMPLETED,
            urgency_score=60, triage_category=TriageCategory.MODERATE,
            created_at=datetime.utcnow() - timedelta(minutes=45),
            risk_flags=["Moderate Pain", "Dizziness"]
        )
        session.add(cons2)

        # Case 3: Failed Processing (Bob) - Failure Queue
        appt3 = Appointment(
            patient_id=created_patients[2].id, doctor_id=doctor.id,
            scheduled_at=datetime.utcnow(), status=AppointmentStatus.CHECKED_IN
        )
        session.add(appt3)
        session.commit()
        session.refresh(appt3)

        cons3 = Consultation(
            appointment_id=appt3.id, patient_id=appt3.patient_id, doctor_id=appt3.doctor_id,
            status=ConsultationStatus.FAILED,
            requires_manual_review=True,
            urgency_score=0,
            notes="Audio transcription failed due to low quality."
        )
        session.add(cons3)

        session.commit()
        print("✅ Demo Data Seeded!")

if __name__ == "__main__":
    seed_data()
