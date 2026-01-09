# 🧠 NeuroAssist_AI v3

> **Next-Gen Clinical Intelligence System**
> *Real-time Audio Analysis, Automated SOAP Implementation, and Clinical Triage.*

ℹ️ **Project Status**: 🟢 **Production Ready (MVP)** | 📅 **Jan 2026**

---

## 🚀 Executive Summary
NeuroAssist is not just a transcription tool; it is a **Clinical Thinking Partner**.
By integration with **Google Gemini 2.0 Flash** (Reasoning), we have built a system that listens to consultation audio and physically safeguards the patient journey.

### 🌟 Key Features Added
*   ✅ **Real-Time Consultation Analysis**: Upload audio -> Get Structured SOAP Notes in `< 30s`.
*   ✅ **Clinical Triage Engine**: Auto-detects "Stroke", "Suicide Risk", or "Severe Pain" and flags urgency.
*   ✅ **Identity-Redacted Privacy**: Filters names/phones but preserves "Seizure" and "Donepezil".
*   ✅ **Doctor Console v2**: Full-Screen Dashboard with "Patient Queue", "Safety Alerts", and "One-Click Signing".
*   ✅ **Visual Progress Tracking**: Beautiful terminal-based progress bars for backend tasks.
*   ✅ **Smart Resume Logic**: Automatically returns doctors to their last active step (Intake vs. Clinical Plan).
*   ✅ **Mock AI Mode**: Developer-friendly simulation mode to bypass API rate limits during testing.
*   ✅ **Resilient Architecture**: Auto-retries on API failures + Persistent PostgreSQL State (Dockerized).

---

## 🛠️ Tech Stack
The system is built on a modern, scalable, and type-safe architecture.

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend** | **Python FastAPI** | High-performance Async I/O, Pydantic V2 validation. |
| **Frontend** | **React + Vite** (TypeScript) | Lightning-fast builds, strict type safety, ShadCN UI for premium aesthetics. |
| **Database** | **SQLModel** (PostgreSQL) | Type-safe ORM, fully Dockerized for consistent environments. |
| **AI (Speech)** | **Gemini 2.0 Flash** | Advanced multi-modal processing for Audio-to-Text with Diarization. |
| **AI (Logic)** | **Google Gemini 2.0 Flash** | Low-latency clinical reasoning and JSON-structured output. |
| **Security** | **OAuth2 + JWT** | Stateless authentication with Role-Based Access Control (RBAC). |

---

## 👨‍💻 Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.10+

```bash
# 1. Environment Setup
cp .env.example .env
# Edit .env to add your GOOGLE_API_KEY

# 2. Start Services (Docker)
docker-compose up -d db

# 3. Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 4. Frontend
cd frontend
npm install
npm run dev
```

### 🧪 Developer Tools

#### Mock AI Mode
To bypass Gemini 429 Rate Limits during UI testing, enable Mock Mode in `.env`:
```bash
USE_MOCK_AI=True
```
This returns instant, simulated transcripts and SOAP notes to facilitate rapid frontend iteration.

---

## ✨ Features of the MVP
We have delivered a fully functional **Minimum Viable Product** with end-to-end clinical workflows.

### 👩‍⚕️ Doctor Portal
*   **Live Patient Queue**: Real-time list of waiting patients, sorted by urgency (Critical > High > Moderate).
*   **Smart Navigation**: "Smart Resume" remembers where you left off (Intake vs. Consultation vs. Plan).
*   **Editable Transcripts**: Correct AI mistakes in real-time before generating the Clinical Plan.
*   **Merged View**: See the transcript generate live while listening to the audio recording.
*   **Safety Alerts**: Visual Warning Banners (Red/Yellow) for drug interactions or critical lab values.

### 🏥 Front Desk & Triage (Admin)
*   **Walk-in Registration**: Instant account creation for new patients.
*   **Voice-Based Intake**: Receptionists can record initial symptoms, which the AI pre-analyzes.
*   **Doctor Assignment**: Manual override to assign specific patients to available specialists.

### 🏗️ Developer Experience
*   **Rich Terminal Logging**: Clear, color-coded status updates and progress bars for long-running AI tasks.
*   **Robust Error Handling**: Graceful degradation when APIs fail, with "Regenerate" options available in the UI.

### 🧠 The AI Engine
*   **Smart Transcription**: Converts raw audio to text with >96% accuracy using Gemini Multimodal.
*   **Speaker Diarization**: Automatically distinguishes between "Doctor" and "Patient" voices.
*   **Structured SOAP Notes**:
    *   **S**ubjective: Patient's complaints.
    *   **O**bjective: Vitals and Observations.
    *   **A**ssessment: Preliminary Diagnosis.
    *   **P**lan: Treatment & Prescriptions.

---

## 🏗️ Project Architecture & Walkthrough

### 1. The Architecture
We migrated from a static Node.js shell to a robust **FastAPI + React** ecosystem.
*   **Backend**: Python FastAPI, SQLModel (PostgreSQL), Async Background Tasks.
*   **Frontend**: React, Vite, TailwindCSS, ShadCN UI.
*   **AI Core**: Google Gemini 2.0 Flash (End-to-End).

### 2. Deep Dive: The "Medical Brain"
1.  **Audio Ingestion**: 50MB+ files accepted via Chunked Uploads.
2.  **Diarization**: Separates "Doctor" vs "Patient" (Speaker A/B).
3.  **Retry Logic**: Exponential backoff handles API quota limits automatically.
4.  **Triage Scanning**: Deterministic logic scans for keywords to assign a `Risk Score`.

👉 **[Read the Technical Memoir](docs/project_implementation_summary.md)**

---

## 🗺️ User Journey (Walkthrough)

### 1. Patient Registration
*   Doctor clicks **"Add Patient"**.
*   Validation ensures appointment is scheduled *5 mins in future*.
*   Patient appears immediately in the **Live Queue**.

### 2. The Consultation
*   **Smart Resume**: System opens directly to the active step.
*   **Recording**: Doctor clicks "Audio Documentation".
*   **Live Transcript**: Text appears in real-time. Doctor can edit errors immediately.

### 3. Clinical Plan
*   **SOAP Note** generates automatically from the transcript.
*   **Final Review**: Doctor reviews Diagnosis and Prescription suggestions.
*   **One-Click Sign**: Clicks "Complete" to finalize the session.

---

## 📊 Reports & Artifacts
*   📄 **[Project Implementation Summary](docs/project_implementation_summary.md)**: A memoir of the entire migration.
*   📄 **[STT Comparison Report](docs/stt_comparison_report.md)**: Proof of >96% accuracy.

---

*Verified by NeuroAssist Team | 2026* 🩺 ✨
