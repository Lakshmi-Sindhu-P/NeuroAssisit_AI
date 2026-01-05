from sqlmodel import Session, select, SQLModel
from app.core.db import engine
from app.models.base import User, UserRole, PatientProfile, Consultation, Appointment, AppointmentStatus, TriageCategory, ConsultationStatus, DoctorProfile
from app.core.security import get_password_hash
from datetime import datetime, timedelta
import random

def seed_queue():
    print("🚀 Seeding High-Traffic Patient Queue...")
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. Get Doctor
        doctor = session.exec(select(User).where(User.email == "dr.alexander@neuro.com")).first()
        if not doctor:
            print("❌ Doctor not found. Run basic seed first.")
            return

        # 2. Patient Data (5 diverse cases)
        patients_config = [
            # (First, Last, Complaint, Category, Urgency, Warning Count)
            ("Liam", "Neeson", "Sudden memory loss", TriageCategory.CRITICAL, 95, 1),
            ("Sarah", "Connor", "Tremors in hand", TriageCategory.HIGH, 75, 0),
            ("Tony", "Stark", "Chest pain (minor)", TriageCategory.MODERATE, 60, 1),
            ("Bruce", "Banner", "Stress/Anger issues", TriageCategory.LOW, 30, 0),
            ("Wanda", "Maximoff", "Visual Hullucinations", TriageCategory.HIGH, 80, 1)
        ]
        
        for first, last, reason, triage, urgency, warnings_count in patients_config:
            email = f"{first.lower()}.{last.lower()}@marvel.com"
            
            # Find or Create Patient
            user = session.exec(select(User).where(User.email == email)).first()
            if not user:
                user = User(email=email, password_hash=get_password_hash("pass"), role=UserRole.PATIENT)
                session.add(user)
                session.commit()
                session.refresh(user)
                
                profile = PatientProfile(
                    user_id=user.id, first_name=first, last_name=last,
                    date_of_birth=datetime(1985, 5, 20), gender="Male" if first != "Sarah" and first != "Wanda" else "Female",
                    medical_history="Recorded history."
                )
                session.add(profile)
                session.commit()
            
            # Create Appointment (Checked In)
            appt = Appointment(
                patient_id=user.id, doctor_id=doctor.id,
                scheduled_at=datetime.utcnow(), status=AppointmentStatus.CHECKED_IN,
                reason=reason
            )
            session.add(appt)
            session.commit()
            session.refresh(appt)
            
            # Create Consultation (Queue Ready)
            # Status MUST be COMPLETED (AI done) and end_time MUST be None
            # Simulate Safety Warnings
            # Simulate Safety Warnings
            warnings = []
            if first == "Tony":
                warnings.append({
                    "type": "CAUTION", 
                    "message": "Potential Interaction: Nitrates (for chest pain) are contraindicated with PDE5 inhibitors (if prescribed). Verify medication history.", 
                    "drug": "Nitroglycerin", 
                    "condition": "Angina"
                })
            elif first == "Wanda":
                 warnings.append({
                    "type": "CAUTION", 
                    "message": "QT Prolongation Risk: Antipsychotics may prolong QT interval. Monitor ECG.", 
                    "drug": "Quetiapine", 
                    "condition": "Psychosis"
                })
            elif first == "Liam":
                 warnings.append({
                    "type": "CONTRAINDICATION", 
                    "message": "High Bleeding Risk: Patient on Warfarin. Avoid NSAIDs.", 
                    "drug": "Warfarin", 
                    "condition": "Atrial Fibrillation"
                })

            consult = Consultation(
                appointment_id=appt.id, patient_id=user.id, doctor_id=doctor.id,
                status=ConsultationStatus.COMPLETED,
                urgency_score=urgency,
                triage_category=triage,
                safety_warnings=warnings,
                end_time=None, # Explicitly NOT finished by doctor
                created_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 120))
            )
            session.add(consult)
            session.commit()
            
        print("✅ Queue seeded with 5 patients (Mixed Urgency).")

if __name__ == "__main__":
    seed_queue()
