# NeuroAssist v3 - AI-Powered Healthcare Platform

A comprehensive healthcare management system with AI-powered audio transcription, symptom analysis, and appointment booking capabilities. 
Migrated to **Python FastAPI** and **React 18**.

## 🚀 Features

### Core Functionality (Frontend & Patient)
- **Patient Management**: Complete patient registration, authentication, and profile management
- **Appointment Booking**: Schedule appointments with doctors, voice or text symptom submission
- **Audio Consultations**: Record and transcribe patient consultations using AssemblyAI
- **Doctors Dashboard**: View appointments, consultations, and patient history
- **Role-Based Access**: Separate interfaces for patients, doctors, and front desk staff

### Advanced AI Services (Backend)
- **Speech-to-Text (STT)**: 
    - **Engine**: AssemblyAI (Async Polling).
    - **Optimization**: Custom Medical Word Boost (e.g., "Levetiracetam") & `speakers_expected=2` for diarization.
    - **Privacy**: Identity-Only Redaction (Names hidden, Conditions visible).
- **LLM**: **Google Gemini 2.5 Flash** for SOAP Note generation.
- **Smart Triage**: AI-driven urgency scoring (Critical/High/Moderate/Low).
- **Clinical Safety**: Automated drug-condition contraindication checks.
- **Resilience**: Zero-Loss guarantee with retry logic and manual review queues.

## 🏆 AI Performance & Validation History (New)
*Documenting the optimization journey from initial pilot to production-ready accuracy.*

| Phase | Configuration | Accuracy (Avg) | Issue Identified | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **Initial** | Default Settings | **26.72%** | **Over-Redaction**: PII engine hid medical terms. <br> **Format Mismatch**: Raw diff penalized "Three" vs "3". | Changed PII Policy to **Identity-Only**. |
| **Optimization** | Identity-Only PII | **37.39%** | **Metric Rigidity**: False failures due to punctuation. | Implemented **Text Normalization**. |
| **Final** | Normalized + Identity-Only | **> 96.0%** | **None**. | **System Verified**. |

### 📂 Validation Reports (Hyperlinks)
Access the detailed proof of verification below:

| Report Type | description | Link |
| :--- | :--- | :--- |
| **STT Comparison** | Full analysis of Audio vs Ground Truth (Files 1-10) | [View Report](docs/reports/stt_comparison_report.md) |
| **Transcript Dump** | Side-by-side text evidence of every file | [View Transcripts](docs/reports/stt_transcript_dump.md) |
| **SOAP Outputs** | 10 Generated Clinical Notes (JSON) | [View JSONs](docs/reports/soap_outputs/) |

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL + SQLModel
- **AI**: AssemblyAI + Google Gemini 2.5
- **Security**: JWT + Bcrypt

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + shadcn/ui

## ⚙️ Installation

### 1. Backend Setup
```bash
# Install Dependencies
pip install -r requirements.txt

# Configure .env (See .env.example)
# Add ASSEMBLYAI_API_KEY, GEMINI_API_KEY, DATABASE_URL

# Run Server
python -m uvicorn app.main:app --reload --port 8000
```
Backend: `http://localhost:8000` | Docs: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend: `http://localhost:8080`

## 🧪 Verification
Run the comprehensive test suite to validate the AI integration:
```bash
pytest tests/test_live_chain.py
```

## 📁 Project Structure
```
DB-API_Integrated_NeuroAssist/
├── app/                 # FastAPI Backend
│   ├── api/            # Routes (Auth, Appointments, Users)
│   ├── services/       # AI Services (STT, LLM)
│   └── main.py         # App Entry
├── frontend/           # React Frontend
│   └── src/            # Components, Pages
├── docs/
│   └── reports/        # Validation Artifacts (STT Reports)
└── tests/              # Verification Scripts
```

## � Recent Updates
- **v3.1 (Current)**: 
    - ✅ **Merged Frontend Integration** (Patient UI).
    - ✅ **Finalized AI Validation**: >96% STT Accuracy verified.
    - ✅ **Validation Hub**: Added `docs/reports` with full evidence.
