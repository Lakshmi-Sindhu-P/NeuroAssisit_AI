import requests
import sys

BASE_URL = "http://localhost:8000/api/v1/auth"

def test_login(email, password):
    print(f"Testing login for {email}...")
    try:
        response = requests.post(
            f"{BASE_URL}/login",
            data={"username": email, "password": password}
        )
        
        if response.status_code == 200:
            token = response.json()
            print("✅ Login SUCCESS!")
            print(f"Token: {token.get('access_token')[:20]}...")
            return True
        else:
            print(f"❌ Login FAILED. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        return False

if __name__ == "__main__":
    success = test_login("dr.smith@neuro.com", "password123")
    if not success:
        sys.exit(1)
