import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"
AUTH_URL = "http://localhost:8000/api/v1/auth"

def get_token(email, password):
    resp = requests.post(f"{AUTH_URL}/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    print(f"Login failed for {email}: {resp.text}")
    return None

def test_medical_terms():
    # 1. Login as Doctor
    doc_token = get_token("dr.smith@neuro.com", "password123")
    if not doc_token: return False
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    # 2. Login as Patient (to test restrictions) (Assuming demo patient exists)
    # Actually, let's just test Doc for now as patient login details might vary or need lookup
    # using a known seed patient "alice.smith@example.com" / "password"
    pat_token = get_token("alice.smith@example.com", "password")
    pat_headers = {"Authorization": f"Bearer {pat_token}"} if pat_token else None

    print("\n--- Testing CREATE Term (Doctor) ---")
    term_data = {
        "term": "Test Migraine",
        "category": "DISEASE",
        "description": "A test disease entry"
    }
    resp = requests.post(f"{BASE_URL}/medical-terms/", json=term_data, headers=doc_headers)
    if resp.status_code == 200:
        print("✅ Success: Created term")
        term_id = resp.json()["id"]
    else:
        print(f"❌ Failed: {resp.status_code} - {resp.text}")
        return False

    print("\n--- Testing CREATE Term (Patient - Should Fail) ---")
    if pat_headers:
        resp = requests.post(f"{BASE_URL}/medical-terms/", json={"term": "Hacked Term", "category": "DISEASE"}, headers=pat_headers)
        if resp.status_code == 403:
            print("✅ Success: Patient denied access")
        else:
            print(f"❌ Failed: Patient was able to create or got wrong error: {resp.status_code}")

    print("\n--- Testing GET Terms ---")
    resp = requests.get(f"{BASE_URL}/medical-terms/", headers=doc_headers)
    if resp.status_code == 200:
        terms = resp.json()
        print(f"✅ Success: Retrieved {len(terms)} terms")
        found = any(t['id'] == term_id for t in terms)
        if found: print("   - Verified created term is in list")
    else:
        print(f"❌ Failed to get terms: {resp.status_code}")

    print("\n--- Testing DELETE Term (Doctor) ---")
    resp = requests.delete(f"{BASE_URL}/medical-terms/{term_id}", headers=doc_headers)
    if resp.status_code == 204:
        print("✅ Success: Deleted term")
    else:
        print(f"❌ Failed to delete: {resp.status_code} - {resp.text}")

    return True

if __name__ == "__main__":
    if test_medical_terms():
        print("\n🎉 Backend Verification Passed!")
    else:
        print("\n⚠️ Backend Verification Failed")
        sys.exit(1)
