import sqlite3
import os

def inspect_db(db_path):
    if not os.path.exists(db_path):
        print(f"File not found: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"\n--- Inspecting: {db_path} ---")
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"Tables: {tables}")
    
    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"Table '{table}': {count} rows")
            
            # Show a sample
            if count > 0:
                cursor.execute(f"SELECT * FROM {table} LIMIT 2")
                cols = [description[0] for description in cursor.description]
                rows = cursor.fetchall()
                print(f"Sample from '{table}':")
                for row in rows:
                    print(dict(zip(cols, row)))
        except Exception as e:
            print(f"Error reading table '{table}': {e}")
    
    conn.close()

if __name__ == "__main__":
    dbs = [
        "neuroassist.db",
        "data/demo_offline.db",
        "data/demo_ranking.db",
        "data/test_dashboard.db"
    ]
    for db in dbs:
        inspect_db(db)
