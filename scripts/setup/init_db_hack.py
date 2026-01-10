import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os

# Default fallback if env var unreadable
DB_USER = "postgres"
DB_PASS = "postgres"
DB_HOST = "localhost"
DB_PORT = "5432"
TARGET_DB = "neuroassistAI"

def create_database():
    try:
        # Connect to default 'postgres' db to create the new one
        con = psycopg2.connect(
            user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT, dbname="postgres"
        )
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = con.cursor()
        
        # Check if exists
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname='{TARGET_DB}'")
        exists = cur.fetchone()
        
        if not exists:
            print(f"Creating database {TARGET_DB}...")
            cur.execute(f'CREATE DATABASE "{TARGET_DB}"')
            print("✅ Database created successfully.")
        else:
            print(f"ℹ️ Database {TARGET_DB} already exists.")
            
        cur.close()
        con.close()
    except Exception as e:
        print(f"❌ Failed to create database: {e}")

if __name__ == "__main__":
    create_database()
