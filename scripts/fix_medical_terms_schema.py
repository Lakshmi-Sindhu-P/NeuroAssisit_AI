from sqlmodel import text
from app.core.db import engine, init_db
from app.models.base import MedicalTerm # Essential for metadata registration

def fix_schema():
    print("Fixing schema...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS medical_terms CASCADE"))
        print("Dropped medical_terms table.")
        conn.commit()
    
    print("Re-creating tables...")
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)
    print("Done.")

if __name__ == "__main__":
    fix_schema()
