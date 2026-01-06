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

        # 2. Patient Data (10 diverse cases for stress testing)
        patients_config = [
            # (First, Last, Complaint, Category, Urgency, Warning Count)
            # CRITICAL
            ("Logan", "Howlett", "Slurred speech, face drooping, left side weakness", TriageCategory.CRITICAL, 98, 0), # Stroke
            ("Steve", "Rogers", "Crushing chest pain radiating to jaw", TriageCategory.CRITICAL, 95, 1), # STEMI
            ("Peter", "Parker", "Throat closing up, ate peanuts", TriageCategory.CRITICAL, 92, 1), # Anaphylaxis
            ("Wade", "Wilson", "High fever 104F, confusion, low BP", TriageCategory.CRITICAL, 90, 0), # Sepsis
            
            # HIGH
            ("Wanda", "Maximoff", "Visual Hullucinations, hearing voices", TriageCategory.HIGH, 80, 1), # Psych
            ("Sarah", "Connor", "Tremors in hand, difficulty walking", TriageCategory.HIGH, 75, 0), # Neuro
            
            # MODERATE
            ("Tony", "Stark", "Mild palpitations, anxiety", TriageCategory.MODERATE, 60, 1),
            ("Natasha", "Romanoff", "Migraine with aura, light sensitivity", TriageCategory.MODERATE, 55, 0),
            
            # LOW
            ("Bruce", "Banner", "Chronic back pain, needing refill", TriageCategory.LOW, 30, 0),
            ("Clint", "Barton", "Ringing in ears (Tinnitus)", TriageCategory.LOW, 25, 0)
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
                    date_of_birth=datetime(1980, 1, 1), gender="Male" if first not in ["Wanda", "Sarah", "Natasha"] else "Female",
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
            
            # Simulate Safety Warnings
            warnings = []
            if first == "Steve": # STEMI
                warnings.append({
                    "type": "CONTRAINDICATION", 
                    "message": "Protocol Alert: Immediate ECG required. Door-to-Balloon time critical.", 
                    "drug": "Protocol", 
                    "condition": "STEMI"
                })
            elif first == "Peter": # Anaphylaxis
                warnings.append({
                    "type": "CRITICAL", 
                    "message": "Airway Risk: Prepare Epinephrine immediately.", 
                    "drug": "Peanuts", 
                    "condition": "Anaphylaxis"
                })
            elif first == "Tony":
                warnings.append({
                    "type": "CAUTION", 
                    "message": "Potential Interaction: Nitrates contraindicated if on PDE5 inhibitors.", 
                    "drug": "Nitroglycerin", 
                    "condition": "Angina"
                })
            elif first == "Wanda":
                 warnings.append({
                    "type": "CAUTION", 
                    "message": "QT Prolongation Risk: Monitor ECG with Antipsychotics.", 
                    "drug": "Quetiapine", 
                    "condition": "Psychosis"
                })

            consult = Consultation(
                appointment_id=appt.id, patient_id=user.id, doctor_id=doctor.id,
                status=ConsultationStatus.COMPLETED,
                urgency_score=urgency,
                triage_category=triage,
                safety_warnings=warnings,
                end_time=None, # Explicitly NOT finished by doctor
                risk_flags=["Critical Symptom"] if triage == TriageCategory.CRITICAL else ["Routine"] if triage == TriageCategory.LOW else ["Monitoring"],
                created_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 120))
            )
            session.add(consult)
            session.commit()
            
        print("✅ Queue seeded with 5 patients (Mixed Urgency).")

if __name__ == "__main__":
    seed_queue()
