import requests
import sys
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_dashboard():
    # 1. Login
    login_url = f"{BASE_URL}/auth/login"
    try:
        resp = requests.post(login_url, data={"username": "dr.smith@neuro.com", "password": "password123"})
        if resp.status_code != 200:
            print(f"Login failed: {resp.text}")
            return False
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
    except Exception as e:
        print(f"Connection error during login: {e}")
        return False

    # 2. Fetch Dashboard Overview
    try:
        # Assuming there is a dashboard endpoint. Checking main.py:
        # app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
        # Checking dashboard.py for endpoints (usually / or /overview or /stats)
        # Let's try /dashboard/overview as per previous context or standard pattern
        # If not sure, I'll try /dashboard/stats or /dashboard/queue
        
        # Let's try to list appointments or queue
        # Consultations: /consultations/queue
        
        print("Fetching Dashboard Queue/Consultations...")
        queue_url = f"{BASE_URL}/dashboard/queue" # Corrected based on main.py and dashboard.py
        # Or dashboard stats
        stats_url = f"{BASE_URL}/dashboard/stats"
        
        # Trying stats first
        resp_stats = requests.get(stats_url, headers=headers)
        if resp_stats.status_code == 200:
            print("✅ Dashboard Stats Access SUCCESS")
            print(json.dumps(resp_stats.json(), indent=2))
        else:
            print(f"⚠️ Dashboard Stats Failed: {resp_stats.status_code} - {resp_stats.text}")

        # Trying queue
        resp_queue = requests.get(queue_url, headers=headers)
        if resp_queue.status_code == 200:
            print("✅ Queue Access SUCCESS")
            data = resp_queue.json()
            print(f"Found {len(data) if isinstance(data, list) else 'N/A'} items in queue")
        else:
             print(f"⚠️ Queue Fetch Failed (might be different endpoint): {resp_queue.status_code}")
             
        return True

    except Exception as e:
        print(f"Error fetching dashboard: {e}")
        return False

if __name__ == "__main__":
    test_dashboard()
