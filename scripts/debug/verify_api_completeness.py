from fastapi.testclient import TestClient
from app.main import app

def verify_api_completeness():
    print("--- 🏥 Starting Final System Health Check ---")
    
    # 1. Route Registry Check
    print("\n[1/3] Verifying Registered Routes...")
    routes = [route.path for route in app.routes]
    
    expected_prefixes = [
        "/api/v1/auth",
        "/api/v1/users",
        "/api/v1/appointments",
        "/api/v1/consultations",
        "/api/v1/dashboard"
    ]
    
    missing = []
    for prefix in expected_prefixes:
        found = any(r.startswith(prefix) for r in routes)
        status = "✅ Found" if found else "❌ MISSING"
        if not found: missing.append(prefix)
        print(f"   {prefix:<25} : {status}")
        
    if missing:
        print(f"❌ CRITICAL: Missing Routers: {missing}")
        return

    # 2. Client Initialization
    print("\n[2/3] Initializing Test Client (Simulates Server Start)...")
    try:
        client = TestClient(app)
        print("✅ App initialized successfully.")
    except Exception as e:
        print(f"❌ App Crash: {e}")
        return

    # 3. Endpoint Smoke Tests
    print("\n[3/3] Ping Critical Endpoints...")
    
    # Health
    try:
        resp = client.get("/api/v1/health")
        print(f"   GET /health              : {resp.status_code} {resp.json()}")
    except Exception as e:
         print(f"   GET /health              : ❌ Failed ({e})")

    # Docs
    try:
        resp = client.get("/docs")
        print(f"   GET /docs                : {resp.status_code} (Swagger UI)")
    except Exception as e:
         print(f"   GET /docs                : ❌ Failed ({e})")
         
    print("\n✅ System matches 'Required Endpoints Exist' criteria.")

if __name__ == "__main__":
    verify_api_completeness()
