import requests
import sys
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "dr.alexander@neuro.com"
PASSWORD = "password123"

def test_add_appointment():
    # 1. Login
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        print("Login failed")
        sys.exit(1)
    token = resp.json()["access_token"]
    
    # 2. Add Appointment
    headers = {"Authorization": f"Bearer {token}"}
    
    # Need a doctor ID. From login 'me' potentially or just use ID from DB if known.
    # Let's get 'me'
    me = requests.get(f"{BASE_URL}/auth/me", headers=headers).json()
    doctor_id = me["id"]
    
    # Need a patient ID. Let's create one or find one.
    # For now, let's just fail if we can't find one. 
    # Actually, the user flow creates a patient first.
    # Let's create a temp patient.
    signup_data = {
        "email": f"testpatient_{int(datetime.now().timestamp())}@test.com",
        "password": "pass",
        "role": "PATIENT",
        "first_name": "Test",
        "last_name": "Patient"
    }
    p_resp = requests.post(f"{BASE_URL}/auth/signup", json=signup_data)
    if p_resp.status_code != 200:
        print(f"Signup failed: {p_resp.text}")
        sys.exit(1)
    patient_id = p_resp.json()["user_id"]
    
    appt_payload = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "doctor_name": "Dr. Tester",
        "scheduled_at": (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
        "reason": "Headache",
        "notes": "Test"
    }
    
    print(f"Sending Appointment Payload: {appt_payload}")
    resp = requests.post(f"{BASE_URL}/appointments/", json=appt_payload, headers=headers)
    
    if resp.status_code == 201:
        print("✅ Appointment Created Successfully!")
    else:
        print(f"❌ Appointment Creation Failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    test_add_appointment()
