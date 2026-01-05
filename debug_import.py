try:
    print("Attempting to import process_consultation_flow...")
    from app.services.consultation_processor import process_consultation_flow
    print("✅ Import successful!")
except Exception as e:
    print(f"❌ Import FAILED: {e}")
    import traceback
    traceback.print_exc()
