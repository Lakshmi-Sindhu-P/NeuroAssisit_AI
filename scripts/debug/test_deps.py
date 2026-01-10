import sys
from app.core.config import settings
from jose import jwt
from app.api.deps import get_current_user
from fastapi import Request
from unittest.mock import MagicMock
from sqlmodel import Session
from app.core.db import engine

# 1. Get a valid token first (reusing logic from successful login)
import requests
BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "dr.alexander@neuro.com"
PASSWORD = "password123"

def get_token():
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
        if resp.status_code != 200:
            print(f"Login failed: {resp.text}")
            sys.exit(1)
        return resp.json()["access_token"]
    except Exception as e:
        print(f"Connection error: {e}")
        sys.exit(1)

def test_deps_logic(token):
    print(f"Testing deps.py logic with token: {token[:10]}...")
    
    # 2. Simulate Request
    req = MagicMock(spec=Request)
    req.method = "GET"
    req.headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Call JWT decode manually like deps.py does
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        print(f"✅ JWT Decode Successful: {payload}")
    except Exception as e:
        print(f"❌ JWT Decode Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    token = get_token()
    test_deps_logic(token)
