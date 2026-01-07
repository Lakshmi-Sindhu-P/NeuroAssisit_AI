from sqlmodel import Session, select, text
from app.core.db import engine
from app.models.base import User, PatientProfile, Consultation, ConsultationStatus, UserRole, Appointment, AppointmentStatus, TriageCategory, DoctorProfile, DoctorStatus
from uuid import uuid4
from datetime import datetime, timedelta
import random

def create_demo_data():
    with Session(engine) as session:
        # CLEANUP: Delete bad data from previous failed runs (where triage_category='Neurology')
        try:
            session.exec(text("DELETE FROM consultations WHERE triage_category = 'Neurology'"))
            session.commit()
            # print("Cleaned up corrupted demo data.")
        except Exception as e:
            print(f"Cleanup warning: {e}")

        # 1. Get ALL Doctors (to ensure current user gets data)
        doctors = session.exec(select(User).where(User.role == UserRole.DOCTOR)).all()
        
        if not doctors:
             # User model only has email/password/role in new schema
             default_doc = User(
                 email="dr.alexander@neuro.com",
                 password_hash="$2b$12$KkFp.9kyiFvI3.1t.1t.1t.1t.1t.1t.1t.1t.1t.1t.1t.1t.1t.1t", # Dummy hash
                 role=UserRole.DOCTOR
             )
             session.add(default_doc)
             session.commit()
             session.refresh(default_doc)
             
             doc_profile = DoctorProfile(
                 user_id=default_doc.id, 
                 first_name="Alexander", 
                 last_name="Fleming",
                 status=DoctorStatus.AVAILABLE
             )
             session.add(doc_profile)
             session.commit()
             doctors = [default_doc]

        print(f"Found {len(doctors)} doctors. Assigning cases to all.")

        # Demo Cases based on Transcripts
        cases = [
            {
                "name": "Ram Prasad", # 84yo man (Parkinson's)
                "age": 84,
                "gender": "Male",
                "file_hint": "5-audio.aac",
                "symptoms": "[DEMO: Upload 5-audio.aac] 84yo, tremors, gait slowing.",
                "urgency": 8,
                "meds": ["Levodopa", "Carbidopa"],
                "allergies": ["Penicillin"]
            },
            {
                "name": "Priya Sharma", # 48yo lady (Optic Neuritis)
                "age": 48,
                "gender": "Female",
                "file_hint": "6-audio.aac",
                "symptoms": "[DEMO: Upload 6-audio.aac] Blurring of vision, history of ON.",
                "urgency": 6,
                "meds": ["Methylprednisolone"],
                "allergies": []
            },
            {
                "name": "Arjun Kumar", # 31yo gentleman (Ataxia)
                "age": 31,
                "gender": "Male",
                "file_hint": "8-audio.aac",
                "symptoms": "[DEMO: Upload 8-audio.aac] Acute onset ataxia, gait imbalance.",
                "urgency": 9,
                "meds": ["CoQ10", "Vitamin E"],
                "allergies": ["Sulfa Drugs"]
            },
            {
                "name": "Vikram Singh", # 23yo man (Seizures)
                "age": 23,
                "gender": "Male",
                "file_hint": "9-audio.aac",
                "symptoms": "[DEMO: Upload 9-audio.aac] Generalized seizures, unresponsiveness.",
                "urgency": 7,
                "meds": ["Valproate"],
                "allergies": ["Peanuts"]
            }
        ]

        for doctor in doctors:
            print(f"Processing for doctor: {doctor.email}")
            for case in cases:
                # Create User/Patient
                fname, lname = case["name"].split(" ", 1)
                
                # Check if exists to avoid dupes
                existing_p = session.exec(select(PatientProfile).where(PatientProfile.first_name == fname).where(PatientProfile.last_name == lname)).first()
                
                if existing_p:
                    patient_user_id = existing_p.user_id
                    # print(f"Patient {fname} {lname} already exists.")
                else:
                    patient_user = User(
                        email=f"{fname.lower()}.{lname.lower()}@example.com",
                        password_hash="hashed_dummy_pass",
                        role=UserRole.PATIENT,
                        is_active=True
                    )
                    session.add(patient_user)
                    session.commit()
                    session.refresh(patient_user)
                    
                    # Create Profile
                    dob = datetime.utcnow() - timedelta(days=case["age"]*365)
                    profile = PatientProfile(
                        user_id=patient_user.id,
                        first_name=fname,
                        last_name=lname,
                        gender=case["gender"],
                        date_of_birth=dob,
                        current_medications=case.get("meds", []),
                        allergies=case.get("allergies", [])
                    )
                    session.add(profile)
                    session.commit()
                    patient_user_id = patient_user.id
                    print(f"Created Patient: {fname} {lname}")

                # Check if Consultation already exists for this doctor/patient to avoid spamming
                existing_consult = session.exec(select(Consultation).where(Consultation.patient_id == patient_user_id).where(Consultation.doctor_id == doctor.id).where(Consultation.status == ConsultationStatus.SCHEDULED)).first()
                if existing_consult:
                     # print(f"Consultation already exists for {fname} with {doctor.email}")
                     continue

                # Create Appointment
                appt_time = datetime.utcnow() + timedelta(days=random.randint(1, 5))
                # Check doctor profile for name
                doc_name = "Dr. Smith"
                # Need to reload doctor to get profile if not loaded
                if doctor.doctor_profile:
                     doc_name = f"{doctor.doctor_profile.first_name} {doctor.doctor_profile.last_name}"
                     
                appointment = Appointment(
                    patient_id=patient_user_id,
                    doctor_id=doctor.id,
                    doctor_name=doc_name,
                    scheduled_at=appt_time,
                    status=AppointmentStatus.SCHEDULED,
                    reason=case["symptoms"],
                    created_at=datetime.utcnow()
                )
                session.add(appointment)
                session.commit()

                # Create Consultation in Queue (SCHEDULED) linked to Appointment
                consult = Consultation(
                    id=uuid4(),
                    appointment_id=appointment.id,
                    patient_id=patient_user_id,
                    doctor_id=doctor.id,
                    status=ConsultationStatus.SCHEDULED,
                    urgency_score=case["urgency"],
                    triage_category=TriageCategory.MODERATE,
                    safety_warnings=[],
                    created_at=datetime.utcnow() - timedelta(minutes=random.randint(10, 120))
                )
                # Add symptoms/reason via notes
                consult.notes = case["symptoms"]
                
                session.add(consult)
                session.commit()
                print(f"Added to Queue for {doctor.email}: {case['symptoms']}")

if __name__ == "__main__":
    create_demo_data()
