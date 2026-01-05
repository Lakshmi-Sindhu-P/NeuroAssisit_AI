import pytest
import os
import httpx
import time
from gtts import gTTS
from uuid import uuid4
from sqlmodel import Session, select
from app.core.db import engine
from app.models.base import Consultation, ConsultationStatus

# Use the base URL defined in conftest or default
BASE_URL = "http://localhost:8000/api/v1"

@pytest.fixture
def auth_headers(client): # client comes from conftest (TestClient)
    """
    Creates a Doctor user and logs in to get a valid JWT token.
    """
    # Unique email for every run
    email = f"doctor_{uuid4()}@test.com"
    password = "password123"
    
    # 1. Signup
    resp = client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": password,
        "role": "DOCTOR",
        "first_name": "Test",
        "last_name": "Doctor"
    })
    assert resp.status_code in [200, 201], f"Signup failed: {resp.text}"
    
    # 2. Login
    resp = client.post("/api/v1/auth/login", data={
        "username": email,
        "password": password
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_audio_file():
    """
    Generates a temporary MP3 file for testing.
    """
    filename = "smoke_test.mp3"
    text = "Patient reports severe headache and nausea for the past two days."
    tts = gTTS(text=text, lang='en')
    tts.save(filename)
    
    yield filename
    
    # Cleanup
    if os.path.exists(filename):
        os.remove(filename)

def test_end_to_end_chain(client, auth_headers, test_audio_file):
    """
    Smoke test: Upload audio -> Wait for AI -> Verify SOAP Note
    """
    # Use the client fixture directly, it's already configured with base_url and can take headers
    client.headers.update(auth_headers)
    
    # 1. Create Appointment (Required parent for Consultation)
    # We need a patient ID first. For simplicity, let's just make the doctor verify their own appointment 
    # OR create a patient user. But the code might allow creating appointment for any patient_id if we have one.
    # Actually, let's create a Patient user.
    
    # Quick helper to create patient
    patient_email = f"patient_{uuid4()}@test.com"
    # Use the client fixture for public endpoints too
    r = client.post("/api/v1/auth/signup", json={
        "email": patient_email, 
        "password": "pw", 
        "role": "PATIENT", 
        "first_name": "John", 
        "last_name": "Doe"
    })
    assert r.status_code in [200, 201]
    patient_id = r.json()["user_id"]
    
    # Get doctor ID from the /me endpoint
    r = client.get("/api/v1/auth/me")
    doctor_id = r.json()["id"]
        
    # Login as Patient to book appointment
    resp = client.post("/api/v1/auth/login", data={
        "username": patient_email,
        "password": "pw"
    })
    assert resp.status_code == 200
    patient_token = resp.json()["access_token"]
    
    # Switch to Patient Context
    client.headers.update({"Authorization": f"Bearer {patient_token}"})

    # Create Appointment
    resp = client.post("/api/v1/appointments/", json={
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "scheduled_at": "2030-01-01T10:00:00+00:00",
        "reason": "Headache",
        "doctor_name": "Dr. Test"
    })
    assert resp.status_code in [200, 201], f"Create Appointment failed: {resp.text}"
    appointment_id = resp.json()["id"]
    
    # Switch back to Doctor Context for Consultation creation (if needed) or stay as patient?
    # Usually Doctor creates consultation.
    client.headers.update(auth_headers)

    # 2. Create Consultation
    resp = client.post("/api/v1/consultations/", json={
        "appointment_id": appointment_id,
        "notes": "Initial intake"
    })
    assert resp.status_code in [200, 201], f"Create Consultation failed: {resp.text}"
    consultation_id = resp.json()["id"]
    
    # 3. Upload Audio
    print(f"Uploading audio for Consultation {consultation_id}...")
    with open(test_audio_file, "rb") as f:
        files = {"file": ("smoke_test.mp3", f, "audio/mpeg")}
        resp = client.post(f"/api/v1/consultations/{consultation_id}/upload", files=files)
        
    assert resp.status_code == 200, f"Upload failed: {resp.text}"
    
    # 4. Poll for Completion
    print("Polling for AI processing completion...")
    # Polling DB directly since we are in TestClient/Integrated environment
    # The background task runs in the same process/db session context usually with TestClient?
    # Actually, BackgroundTasks in TestClient run *after* the request.
    # So by the time we get the response, the task has *started* or *finished*?
    # Starlette TestClient runs background tasks synchronousy *after* the request handler returns.
    
    # So we can just check the DB immediately.
    
    # Wait loop just in case executor threads are involved
    max_retries = 20
    # Poll and Assertions
    # Wait loop just in case executor threads are involved
    max_retries = 20
    final_consultation = None
    success = False
    
    for i in range(max_retries):
        with Session(engine) as session:
            # Re-fetch
            final_consultation = session.get(Consultation, consultation_id)
            if final_consultation.status == ConsultationStatus.COMPLETED:
                # 5. Assertions (Must be done inside session to access relationships)
                print("Verifying results...")
                
                # Check Transcript
                audio_data = final_consultation.audio_file
                assert audio_data is not None
                assert "headache" in audio_data.transcription.lower()
                
                # Check SOAP Note (Should be GENERATED now)
                soap_note_record = final_consultation.soap_note
                if not soap_note_record:
                    print("ERROR: SOAP Note Missing! LLM Integration failed.")
                    pytest.fail("SOAP Note not generated.")
                else:
                    print("Verified: SOAP Note Generated!")
                    print(f"Risk Flags: {soap_note_record.risk_flags}")
                    # Basic check of structure
                    assert soap_note_record.soap_json is not None
                    assert "subjective" in soap_note_record.soap_json
                    
                print("Test Passed: Full AI Chain Verified!")
                success = True
                break
                
            elif final_consultation.status == ConsultationStatus.FAILED:
                pytest.fail(f"Processing failed with status: {final_consultation.status}")
                
        time.sleep(2)
        
    if not success:
         pytest.fail("Timed out waiting for consultation to complete.")

@pytest.fixture
def corrupt_audio_file():
    """
    Generates a temporary corrupt file (random bytes).
    """
    filename = "corrupt.mp3"
    with open(filename, "wb") as f:
        f.write(os.urandom(1024)) # 1KB of random noise
    
    yield filename
    
    # Cleanup
    if os.path.exists(filename):
        os.remove(filename)

def test_corrupt_file_upload(client, auth_headers, corrupt_audio_file):
    """
    Resilience Test: Upload invalid audio -> Ensure system handles it gracefully (FAILED status)
    """
    # Use the client fixture directly, it's already configured with base_url and can take headers
    client.headers.update(auth_headers)
    
    # 1. Setup Data (Need a fresh consultation)
    # Get Doctor ID
    r = client.get("/api/v1/auth/me")
    doctor_id = r.json()["id"]
    
    # Create Patient
    patient_email = f"patient_bad_{uuid4()}@test.com"
    # Use fixture client
    r = client.post("/api/v1/auth/signup", json={
        "email": patient_email, "password": "pw", "role": "PATIENT", 
        "first_name": "J", "last_name": "D"
    })
    assert r.status_code in [200, 201]
    patient_id = r.json()["user_id"]

    # Login as Patient
    resp = client.post("/api/v1/auth/login", data={
        "username": patient_email,
        "password": "pw"
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})

    # Create Appointment
    resp = client.post("/api/v1/appointments/", json={
        "patient_id": patient_id, "doctor_id": doctor_id, "scheduled_at": "2030-01-02T10:00:00+00:00",
        "doctor_name": "Dr. Test", "reason": "Test"
    })
    appointment_id = resp.json()["id"]
    
    # Switch back to Doctor for Consultation
    client.headers.update(auth_headers)

    # Create Consultation
    resp = client.post("/api/v1/consultations/", json={"appointment_id": appointment_id})
    consultation_id = resp.json()["id"]
    
    # 2. Upload Corrupt File
    print(f"Uploading corrupt audio for Consultation {consultation_id}...")
    with open(corrupt_audio_file, "rb") as f:
        files = {"file": ("corrupt.mp3", f, "audio/mpeg")}
        resp = client.post(f"/api/v1/consultations/{consultation_id}/upload", files=files)
        
    # The API might accept it (200) because extension is .mp3.
    # If it validates header/magic numbers synchronously, it might 400.
    # But currently our code only checks extension. So we expect 200.
    if resp.status_code == 400:
        print("API rejected corrupt file immediately (Good).")
        return
        
    assert resp.status_code == 200, f"Upload failed check: {resp.text}"
    
    # 3. Poll for Failure
    print("Polling for expected failure...")
    # Polling DB directly
    max_retries = 20
    final_consultation = None
    for i in range(max_retries):
        with Session(engine) as session:
            consultation_from_db = session.get(Consultation, consultation_id)
            status = consultation_from_db.status
            print(f"Status: {status}")
            
            if status == ConsultationStatus.FAILED:
                final_consultation = consultation_from_db
                break
            elif status == ConsultationStatus.COMPLETED:
                pytest.fail("System strangely completed processing for corrupt file!")
        time.sleep(1)
        
    assert final_consultation is not None, "Timed out waiting for failure status."
    assert final_consultation.status == ConsultationStatus.FAILED, "Consultation did not fail as expected."

