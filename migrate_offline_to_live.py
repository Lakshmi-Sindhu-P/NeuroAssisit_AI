import json
from datetime import datetime, timedelta
from uuid import uuid4
from sqlmodel import Session, select, SQLModel
from app.core.db import engine
from app.models.base import (
    User, UserRole, PatientProfile, Consultation, ConsultationStatus, 
    Appointment, AppointmentStatus, TriageCategory, SOAPNote, DoctorProfile
)
from app.core.security import get_password_hash
from app.services.triage_service import TriageService
from app.services.safety_service import SafetyService

def migrate_offline_data():
    print("🚀 Migrating Offline Data to Live Queue...")
    
    # Fixture Data (Extracted from demo_offline.py logic)
    cases = [
        {
            "filename": "demo_migraine.wav",
            "patient": {"first": "Sarah", "last": "Connor", "history": "History of chronic migraines."},
            "soap": {
                "subjective": "Patient reports severe throbbing headache on left side, photophobia, and nausea for 3 days. Previous sumatriptan not effective.",
                "objective": "BP 130/85. Distressed appearance due to pain.",
                "assessment": "Status Migrainosus vs Refractory Migraine.",
                "plan": "Consider IV hydration and DHE protocol."
            },
            "risk_flags": [],
            "status": ConsultationStatus.COMPLETED
        },
        {
            "filename": "demo_chestpain.wav",
            "patient": {"first": "Rick", "last": "Deckard", "history": "Hypertension, Smoker."},
            "soap": {
                "subjective": "Patient describes crushing chest pain radiating to left arm. Started 1 hour ago while resting.",
                "objective": "BP 160/100, HR 110. Diaphoretic.",
                "assessment": "Possible Acute Myocardial Infarction (STEMI?).",
                "plan": "Immediate ECG, Aspirin, Nitroglycerin. Transfer to ER."
            },
            "risk_flags": ["Chest Pain", "Cardiac Risk"],
            "status": ConsultationStatus.COMPLETED
        },
        {
             "filename": "demo_partialy_failed.wav",
             "patient": {"first": "Morty", "last": "Smith", "history": "Anxiety."},
             "soap": {
                 "subjective": "Patient reports feeling anxious about upcoming exam.",
                 "assessment": "General Anxiety.",
            },
             "risk_flags": [],
             "status": ConsultationStatus.FAILED, # Force into Failure Queue
             "notes": "Audio quality poor. AI Transcription incomplete."
        }
    ]

    with Session(engine) as session:
        # Get Doctor
        doctor = session.exec(select(User).where(User.role == UserRole.DOCTOR)).first()
        if not doctor:
            print("❌ No Doctor found! Run seed_demo_data.py first.")
            return

        for case in cases:
            # 1. Create Patient
            email = f"{case['patient']['first'].lower()}.{case['patient']['last'].lower()}@example.com"
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
                    first_name=case['patient']['first'],
                    last_name=case['patient']['last'],
                    medical_history=case['patient']['history'],
                    date_of_birth=datetime(1985, 5, 20),
                    gender="Male" if case['patient']['first'] in ["Rick", "Morty"] else "Female"
                )
                session.add(profile)
                session.commit()
            
            # 2. Create Appointment (In Progress/Checked In)
            appt = Appointment(
                patient_id=user.id, doctor_id=doctor.id,
                scheduled_at=datetime.utcnow(), status=AppointmentStatus.CHECKED_IN
            )
            session.add(appt)
            session.commit()
            session.refresh(appt)

            # 3. Create Consultation
            cons = Consultation(
                appointment_id=appt.id, patient_id=user.id, doctor_id=doctor.id,
                status=case['status'],
                created_at=datetime.utcnow() - timedelta(minutes=15)
            )
            
            # 4. Add SOAP & Logic
            if case['status'] != ConsultationStatus.FAILED:
                # Create SOAP Object
                soap = SOAPNote(
                    consultation_id=cons.id,
                    soap_json=case['soap'],
                    risk_flags={"flags": case['risk_flags']},
                    generated_by_ai=True
                )
                # Not adding to session yet, need ID? No, ID auto-gen.
                # Actually need to add cons first to get ID? ID is uuid4 factory. 
                # But safer to add cons first.
                session.add(cons)
                session.commit()
                session.refresh(cons)
                
                soap.consultation_id = cons.id
                session.add(soap)
                
                # Run Logic
                profile = session.exec(select(PatientProfile).where(PatientProfile.user_id == user.id)).first()
                urgency, category = TriageService.calculate_urgency(soap, profile)
                cons.urgency_score = urgency
                cons.triage_category = category
                
                warnings = SafetyService.check_drug_interactions(soap, profile)
                cons.safety_warnings = warnings
            else:
                cons.requires_manual_review = True
                cons.notes = case['notes']
                session.add(cons)

            session.commit()
            print(f"✅ Added {case['patient']['first']} {case['patient']['last']} to Queue.")

if __name__ == "__main__":
    migrate_offline_data()
