from enum import Enum
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship, JSON, Column

class UserRole(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    FRONT_DESK = "FRONT_DESK"

class AppointmentStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    CHECKED_IN = "CHECKED_IN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    WAIVED = "WAIVED"

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    patient_profile: Optional["PatientProfile"] = Relationship(back_populates="user", sa_relationship_kwargs={"uselist": False})
    doctor_profile: Optional["DoctorProfile"] = Relationship(back_populates="user", sa_relationship_kwargs={"uselist": False})

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
    is_available: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="doctor_profile")

class Appointment(SQLModel, table=True):
    __tablename__ = "appointments"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    patient_id: UUID = Field(foreign_key="users.id")
    doctor_id: UUID = Field(foreign_key="users.id")
    doctor_name: Optional[str] = Field(default=None)
    scheduled_at: datetime = Field(index=True)
    reason: Optional[str] = None
    status: AppointmentStatus = Field(default=AppointmentStatus.SCHEDULED, index=True)
    payment_status: PaymentStatus = Field(default=PaymentStatus.PENDING)
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
    status: ConsultationStatus = Field(default=ConsultationStatus.SCHEDULED)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    urgency_score: Optional[int] = None
    triage_category: Optional[TriageCategory] = None
    safety_warnings: Optional[List[dict]] = Field(default=None, sa_column=Column(JSON))
    requires_manual_review: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    appointment: Appointment = Relationship(back_populates="consultation")
    audio_files: List["AudioFile"] = Relationship(back_populates="consultation")
    soap_note: Optional["SOAPNote"] = Relationship(back_populates="consultation", sa_relationship_kwargs={"uselist": False})
    
    risk_flags: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))

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
    consultation_id: UUID = Field(foreign_key="consultations.id", index=True) # Removed unique=True
    uploaded_by: AudioUploaderType = Field()
    file_type: AudioFileType = Field(default=AudioFileType.PRE_VISIT)
    file_name: str
    file_url: str
    file_size: Optional[int] = None
    duration: Optional[float] = None
    mime_type: Optional[str] = None
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

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    action: str # VIEW, CREATE, UPDATE, DELETE
    resource_type: str # CONSULTATION, PATIENT, etc.
    resource_id: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
