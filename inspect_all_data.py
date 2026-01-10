import sqlite3
import os
import json

def inspect_db(db_path):
    if not os.path.exists(db_path):
        return None
    
    data = {}
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    tables = ['users', 'patient_profiles', 'doctor_profiles', 'front_desk_profiles']
    for table in tables:
        try:
            cursor.execute(f"SELECT * FROM {table}")
            cols = [d[0] for d in cursor.description]
            rows = cursor.fetchall()
            data[table] = [dict(zip(cols, r)) for r in rows]
        except:
            data[table] = []
            
    conn.close()
    return data

if __name__ == "__main__":
    results = {}
    dbs = {
        "primary": "neuroassist.db",
        "demo_offline": "data/demo_offline.db",
        "test_dashboard": "data/test_dashboard.db"
    }
    
    for label, path in dbs.items():
        results[label] = inspect_db(path)
        
    print(json.dumps(results, indent=2))
