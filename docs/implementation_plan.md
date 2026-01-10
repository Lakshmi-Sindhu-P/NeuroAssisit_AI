# Doctor UI Overhaul & Queue Refinement

This plan focuses on transforming the Doctor Portal into a modern, multi-page application with a "breathable" design, while resolving critical queue logic bugs.

## User Review Required
> [!IMPORTANT]
> **Queue Logic Change**: `consultation_processor.py` will now keep consultations as `IN_PROGRESS` after AI processing. Status `COMPLETED` will ONLY be set when the doctor explicitly marks it as finished.
> **Add Patient Logic**: Manual "Add Patient" will now automatically set the consultation status to `IN_PROGRESS` so it appears in the Active Queue immediately.

## Proposed Changes

### 1. Backend Logic
#### [consultation_processor.py](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/app/services/consultation_processor.py)
- **Modify**: Remove `status = COMPLETED` assignment. Keep it `IN_PROGRESS`.

#### [dashboard.py](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/app/api/v1/dashboard.py)
- **Modify**: Ensure `get_patient_queue` is robust (it currently filters properly, but we'll double check sort order).

#### [AddPatientModal.tsx (Logic)](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/frontend/src/components/doctor/AddPatientModal.tsx)
- **Refactor**: When adding to queue, explicitly call an endpoint (or update existing) to set status to `IN_PROGRESS` so it appears in the dashboard immediately.

### 2. Frontend Architecture (Routing)
#### [App.tsx](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/frontend/src/App.tsx)
- **Refactor**: Update `/doctor/*` routes to use a nested `DoctorLayout`.
    - `/doctor/dashboard` (Overview + Queue)
    - `/doctor/patients` (Patient Directory)
    - `/doctor/consultation/:id` (Active Consultation - Full Page)

#### [NEW] [DoctorLayout.tsx](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/frontend/src/components/doctor/DoctorLayout.tsx)
- **Create**: A dedicated layout with a vertical sidebar navigation (Dashboard, Patients, History, Settings).

### 3. UI/UX Components
#### [ActiveConsultation.tsx](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/frontend/src/components/doctor/ActiveConsultation.tsx)
- **Refactor**: Convert to a full-page experience.
    - **Layout**: 3-Column or Tabbed.
        - Left: Patient Info (Collapsible).
        - Center: SOAP Note (Wide, readable).
        - Right: Clinical Actions (Diagnosis, Rx, status).
    - **Breathability**: Increase padding, use white space, larger typography.

#### [NEW] [PatientDirectory.tsx](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/frontend/src/pages/doctor/PatientDirectory.tsx)
- **Create**: A clear list/table of all patients associated with the doctor.
    - Search/Filter by name.
    - Actions: "View History", "Start Consultation".
- **Dashboard**: Complete overhaul with new `ActiveConsultationPage`.
- **Backend Fixes**: Resolved Pydantic serialization issues.

# Phase 3: Files & Retakes

## Goal
Enable post-generation audio updates, generic medical document uploads (Scans, Rx), and file downloads.

## Proposed Changes

### Backend (`app/models/base.py`)
- **New Enum**: `DocumentType` (PRESCRIPTION, LAB_REPORT, SCAN, OTHER)
- **New Model**: `MedicalDocument` linking to `Consultation`.
- **Update**: `Consultation` to include `medical_documents` relationship.

### Backend (`app/api/v1/consultations.py`)
- **New Endpoint**: `POST /{id}/upload-document`
- **Update**: `get_consultation` manual serialization to include `medical_documents`.

### Frontend (`ActiveConsultationPage.tsx`)
1.  **Rectify Audio**: Add "Redo Session" button in SOAP view. Logic to reset state and show input.
2.  **Document Upload**: Add "Documents" tab with file upload UI.
3.  **Downloads**: List all files in the "Clinical Documentation" or a new "Attachments" section.

### Phase 3.1: Prescription Digitization (New)
#### [app/api/v1/consultations.py](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/app/api/v1/consultations.py)
- `POST /{id}/analyze-document`: Endpoint to send image to Gemini Flash for OCR/Transcription.
- Logic:
    1. Retrieve uploaded document path.
    2. Encode image.
    3. Send to Gemini with prompt: "Transcribe this handwritten medical prescription into structured text."
    4. Return text.

#### [frontend/src/pages/doctor/ActiveConsultationPage.tsx](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/frontend/src/pages/doctor/ActiveConsultationPage.tsx)
- Add "Type Prescription" mode (Textarea).
- Add "Analyze" button for uploaded Prescriptions.
- Populate "Type Prescription" textarea with OCR result.

## Verification
- **Test**: Upload a document and verify it appears.
- **Test**: Create SOAP, then "Redo" audio, upload new file, verify valid state transition.

#### [AddPatientModal.tsx](file:///Users/sindhu/Projects/DB-API_Integrated_NeuroAssist/frontend/src/components/doctor/AddPatientModal.tsx)
- **Enhancement**: Polish the form to be cleaner. Ensure it provides feedback.

## Verification Plan

### Automated Tests
- None planned for UI refactor.

### Manual Verification
1.  **Bug Fix**:
    - Upload audio -> Wait for AI -> Verify Patient stays in Queue.
2.  **Navigation**:
    - Verify clicking "Start" in Queue navigates to `/doctor/consultation/:id`.
    - Verify Sidebar links work.
3.  **Add Patient**:
    - create new patient via modal -> Verify they appear in "Active Queue".
4.  **UI Breathability**:
    - Resize window to check responsiveness.
    - Verify SOAP notes are easy to read.