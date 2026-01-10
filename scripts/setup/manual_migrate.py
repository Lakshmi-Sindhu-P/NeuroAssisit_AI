import sqlite3

def add_columns():
    db_path = "neuroassist.db" # Default DB
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if 'age' exists in patient_profiles
    try:
        cursor.execute("ALTER TABLE patient_profiles ADD COLUMN age INTEGER")
        print("Added 'age' column.")
    except Exception as e:
        print(f"Skipped 'age': {e}")
        
    try:
        cursor.execute("ALTER TABLE patient_profiles ADD COLUMN gender_identity VARCHAR")
        print("Added 'gender_identity' column.")
    except:
        pass
        
    try:
        cursor.execute("ALTER TABLE patient_profiles ADD COLUMN emergency_contact_name VARCHAR")
        print("Added 'emergency_contact_name' column.")
    except:
        pass

    try:
        cursor.execute("ALTER TABLE patient_profiles ADD COLUMN emergency_contact_phone VARCHAR")
        print("Added 'emergency_contact_phone' column.")
    except:
        pass

    try:
        cursor.execute("ALTER TABLE patient_profiles ADD COLUMN current_medications VARCHAR")
        print("Added 'current_medications' column.")
    except:
        pass

    try:
        cursor.execute("ALTER TABLE patient_profiles ADD COLUMN medical_history VARCHAR")
        print("Added 'medical_history' column.")
    except:
        pass

    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_columns()
