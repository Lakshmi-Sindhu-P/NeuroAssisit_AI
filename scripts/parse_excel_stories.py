
import pandas as pd
import os

file_path = "NeuroAssist- User Stories MVP-Jan102026.xlsx"
if not os.path.exists(file_path):
    print(f"Error: File not found at {file_path}")
    exit(1)

try:
    df = pd.read_excel(file_path)
    print("## Excel Content Preview")
    print(df.to_markdown(index=False))
except Exception as e:
    print(f"Error reading excel: {e}")
