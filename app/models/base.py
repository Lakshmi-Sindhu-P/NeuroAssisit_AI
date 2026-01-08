from enum import Enum
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship, JSON, Column

from sqlalchemy import Enum as SAEnum

class UserRole(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    FRONT_DESK = "FRONT_DESK"
    MASTER_ADMIN = "MASTER_ADMIN"

class AppointmentStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    CHECKED_IN = "CHECKED_IN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class DoctorStatus(str, Enum):
    """Doctor availability status for scheduling and access control"""
    AVAILABLE = "AVAILABLE"        # Available for appointments, can login
    ON_LEAVE = "ON_LEAVE"          # Temporarily unavailable, can login
    DEACTIVATED = "DEACTIVATED"    # Account disabled - cannot login or be assigned

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(sa_column=Column(SAEnum(UserRole, native_enum=False), index=True))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    patient_profile: Optional["PatientProfile"] = Relationship(back_populates="user", sa_relationship_kwargs={"uselist": False})
    doctor_profile: Optional["DoctorProfile"] = Relationship(back_populates="user", sa_relationship_kwargs={"uselist": False})
    # Front Desk profile relationship
    front_desk_profile: Optional["FrontDeskProfile"] = Relationship(back_populates="user", sa_relationship_kwargs={"uselist": False})

    patient_appointments: List["Appointment"] = Relationship(
        back_populates="patient", 
        sa_relationship_kwargs={"foreign_keys": "Appointment.patient_id"}
    )
    doctor_appointments: List["Appointment"] = Relationship(
        back_populates="doctor", 
        sa_relationship_kwargs={"foreign_keys": "Appointment.doctor_id"}
    )

class PatientProfile(SQLModel, table=True):
    __tablename__ = "patient_profiles"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", unique=True)
    first_name: str
    last_name: str
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    medical_history: Optional[str] = None # Added for Safety Service
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="patient_profile")

class DoctorProfile(SQLModel, table=True):
    __tablename__ = "doctor_profiles"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", unique=True)
    first_name: str
    last_name: str
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    years_of_experience: Optional[int] = None
    qualification: Optional[str] = None
    phone_number: Optional[str] = None
    clinic_address: Optional[str] = None
    consultation_fee: Optional[float] = None
    bio: Optional[str] = None
    status: DoctorStatus = Field(
        default=DoctorStatus.AVAILABLE,
        sa_column=Column(SAEnum(DoctorStatus, native_enum=False))
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="doctor_profile")

# Front Desk Status Enum
class FrontDeskStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

# Front Desk Profile - no age/gender required
class FrontDeskProfile(SQLModel, table=True):
    __tablename__ = "front_desk_profiles"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", unique=True)
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    status: FrontDeskStatus = Field(
        sa_column=Column(SAEnum(FrontDeskStatus, native_enum=False), default=FrontDeskStatus.ACTIVE)
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="front_desk_profile")

class Appointment(SQLModel, table=True):
    __tablename__ = "appointments"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    patient_id: UUID = Field(foreign_key="users.id")
    doctor_id: UUID = Field(foreign_key="users.id")
    doctor_name: Optional[str] = Field(default=None)
    scheduled_at: datetime = Field(index=True)
    reason: Optional[str] = None
    status: AppointmentStatus = Field(
        sa_column=Column(SAEnum(AppointmentStatus, native_enum=False), default=AppointmentStatus.SCHEDULED, index=True)
    )
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    patient: User = Relationship(
        back_populates="patient_appointments", 
        sa_relationship_kwargs={"foreign_keys": "Appointment.patient_id"}
    )
    doctor: User = Relationship(
        back_populates="doctor_appointments", 
        sa_relationship_kwargs={"foreign_keys": "Appointment.doctor_id"}
    )
    consultation: Optional["Consultation"] = Relationship(back_populates="appointment", sa_relationship_kwargs={"uselist": False})

class ConsultationStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"

class TriageCategory(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"

class Consultation(SQLModel, table=True):
    __tablename__ = "consultations"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    appointment_id: UUID = Field(foreign_key="appointments.id", unique=True, index=True)
    patient_id: UUID = Field(foreign_key="users.id")
    doctor_id: UUID = Field(foreign_key="users.id")
    status: ConsultationStatus = Field(
        sa_column=Column(SAEnum(ConsultationStatus, native_enum=False), default=ConsultationStatus.SCHEDULED)
    )
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    urgency_score: Optional[int] = None
    triage_category: Optional[TriageCategory] = Field(
        sa_column=Column(SAEnum(TriageCategory, native_enum=False), nullable=True)
    )
    triage_reason: Optional[str] = None  # Why this triage level was assigned
    triage_source: Optional[str] = None  # "AI" or "MANUAL"
    safety_warnings: Optional[List[dict]] = Field(default=None, sa_column=Column(JSON))
    requires_manual_review: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    appointment: Appointment = Relationship(back_populates="consultation")
    audio_files: List["AudioFile"] = Relationship(back_populates="consultation")
    documents: List["MedicalDocument"] = Relationship(back_populates="consultation")
    soap_note: Optional["SOAPNote"] = Relationship(back_populates="consultation", sa_relationship_kwargs={"uselist": False})

class AudioUploaderType(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    SYSTEM = "SYSTEM"

class AudioFileType(str, Enum):
    PRE_VISIT = "PRE_VISIT"
    CONSULTATION = "CONSULTATION"

class AudioFile(SQLModel, table=True):
    __tablename__ = "audio_files"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    consultation_id: UUID = Field(foreign_key="consultations.id", index=True)
    uploaded_by: AudioUploaderType = Field(
        sa_column=Column(SAEnum(AudioUploaderType, native_enum=False))
    )
    mime_type: AudioFileType = Field(default=AudioFileType.PRE_VISIT)
    file_name: str
    file_url: str
    file_size: Optional[int] = None
    duration: Optional[float] = None
    transcription: Optional[str] = None # Text field
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    consultation: Consultation = Relationship(back_populates="audio_files")

class SOAPNote(SQLModel, table=True):
    __tablename__ = "soap_notes"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    consultation_id: UUID = Field(foreign_key="consultations.id", unique=True)
    soap_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    risk_flags: Optional[dict] = Field(default=None, sa_column=Column(JSON)) # Assuming JSON based on plan
    confidence: Optional[float] = None
    generated_by_ai: bool = Field(default=True)
    reviewed_by_doctor: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    consultation: Consultation = Relationship(back_populates="soap_note")

class AILog(SQLModel, table=True):
    __tablename__ = "ai_logs"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    consultation_id: Optional[UUID] = Field(foreign_key="consultations.id", nullable=True)
    model_version: str
    status: str # SUCCESS, FAIL
    latency_ms: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Clinic(SQLModel, table=True):
    """Clinic/Department for organizing doctors and front desk staff"""
    __tablename__ = "clinics"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)
    location: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AuditLog(SQLModel, table=True):
    """Audit log for tracking user actions and changes"""
    __tablename__ = "audit_logs"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: Optional[UUID] = Field(foreign_key="users.id", nullable=True)
    action: str  # CREATE_USER, UPDATE_USER, DEACTIVATE_USER, LOGIN, etc.
    target_type: Optional[str] = None  # USER, DOCTOR, FRONT_DESK, CLINIC
    target_id: Optional[UUID] = None
    details: Optional[str] = None  # JSON string with additional details
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentType(str, Enum):
    LAB_REPORT = "LAB_REPORT"
    IMAGING = "IMAGING"
    PRESCRIPTION = "PRESCRIPTION"
    OTHER = "OTHER"

class MedicalDocument(SQLModel, table=True):
    __tablename__ = "medical_documents"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    consultation_id: UUID = Field(foreign_key="consultations.id", index=True)
    document_type: DocumentType = Field(sa_column=Column(SAEnum(DocumentType, native_enum=False)))
    file_name: str
    file_url: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    consultation: Consultation = Relationship(back_populates="documents")
