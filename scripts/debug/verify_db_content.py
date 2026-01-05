from sqlmodel import Session, select, func
from app.core.db import engine,SQLModel
from app.models.base import Consultation, PatientProfile, ConsultationStatus, User

def verify():
    print("params: Checking DB Content...")
    with Session(engine) as session:
        # Check counts
        n_users = session.exec(select(func.count(User.id))).one()
        n_profiles = session.exec(select(func.count(PatientProfile.id))).one()
        n_consultations = session.exec(select(func.count(Consultation.id))).one()
        n_completed = session.exec(select(func.count(Consultation.id)).where(Consultation.status == ConsultationStatus.COMPLETED)).one()
        
        print(f"Users: {n_users}")
        print(f"Profiles: {n_profiles}")
        print(f"Consultations (Total): {n_consultations}")
        print(f"Consultations (Completed): {n_completed}")
        
        # Check Join
        print("\nChecking Join Validity (Consultation + Profile)...")
        query = (
            select(Consultation.id, PatientProfile.first_name, Consultation.status)
            .join(PatientProfile, Consultation.patient_id == PatientProfile.user_id)
            .where(Consultation.status == ConsultationStatus.COMPLETED)
        )
        results = session.exec(query).all()
        
        if not results:
            print("❌ Query returned 0 results! Join might be failing.")
            # Debug why
            print("  Values in Consultations:")
            consults = session.exec(select(Consultation).limit(5)).all()
            for c in consults:
                print(f"  - cid={c.id} pid={c.patient_id} status={c.status}")
                
            print("  Values in Profiles:")
            profs = session.exec(select(PatientProfile).limit(5)).all()
            for p in profs:
                 print(f"  - uid={p.user_id} name={p.first_name}")
        else:
            print(f"✅ Query returned {len(results)} rows. Data exists.")
            for r in results:
                print(f"  - {r}")

if __name__ == "__main__":
    verify()
