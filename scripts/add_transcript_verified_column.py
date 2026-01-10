from sqlmodel import Session, text
from app.core.db import engine

def add_column():
    with Session(engine) as session:
        try:
            # Check if column exists logic omitted for brevity, just try add
            session.exec(text("ALTER TABLE audio_files ADD COLUMN is_transcript_verified BOOLEAN DEFAULT FALSE"))
            session.commit()
            print("Successfully added is_transcript_verified column.")
        except Exception as e:
            print(f"Error (column might exist): {e}")

if __name__ == "__main__":
    add_column()
