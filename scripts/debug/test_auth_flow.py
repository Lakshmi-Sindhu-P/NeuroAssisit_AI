import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "dr.alexander@neuro.com"
PASSWORD = "password123"

def test_auth():
    print(f"Testing Login for {EMAIL}...")
    
    # 1. Login
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
        if resp.status_code != 200:
            print(f"❌ Login Failed: {resp.status_code} - {resp.text}")
            sys.exit(1)
        
        data = resp.json()
        token = data["access_token"]
        print(f"✅ Login Successful. Token obtained (len={len(token)})")
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        sys.exit(1)

    # 2. Test Protected Endpoint (Get Me)
    print("Testing Protected Endpoint (/auth/me)...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if resp.status_code == 200:
            user = resp.json()
            print(f"✅ Auth Verified. User ID: {user['id']}")
            return token
        else:
            print(f"❌ Auth Verification Failed: {resp.status_code} - {resp.text}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Request Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_auth()
