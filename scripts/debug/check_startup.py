import sys
import os

# Ensure project root is in path
sys.path.append(os.getcwd())

try:
    print("Attempting to import Pydantic...")
    import pydantic
    print(f"Pydantic version: {pydantic.VERSION}")

    print("Attempting to import FastAPI...")
    import fastapi
    print(f"FastAPI version: {fastapi.__version__}")

    print("Attempting to import SQLModel...")
    import sqlmodel
    print("SQLModel imported.")

    print("Attempting to import app.main...")
    from app.main import app
    print("Successfully imported app.main")

except Exception as e:
    print(f"\nCRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
