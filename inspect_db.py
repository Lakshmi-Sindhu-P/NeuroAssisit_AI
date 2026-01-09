from sqlmodel import Session, create_engine, select
import sys
import os

# Set up path to import app modules
sys.path.append(os.getcwd())

from app.models.base import User
from app.core.config import settings

engine = create_engine("sqlite:///./neuroassist.db")

def inspect_db():
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        print(f"Total users: {len(users)}")
        for u in users:
            print(f"User: {u.email}, ID: {u.id}, ID Type: {type(u.id)}")

if __name__ == "__main__":
    inspect_db()
