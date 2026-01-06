from sqlmodel import SQLModel
from app.core.db import engine
from app.models.base import * # Import all models to ensure metadata is registered

def reset_schema():
    print("⚠️  DANGER: Dropping all tables...")
    SQLModel.metadata.drop_all(engine)
    print("✅ Tables dropped.")
    
    print("🔨 Recreating tables with new schema...")
    SQLModel.metadata.create_all(engine)
    print("✅ Tables created successfully.")

if __name__ == "__main__":
    reset_schema()
