from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1 import auth, users, appointments, consultations, dashboard, admin, master_admin, patient, transcription, frontdesk, medical_terms

from app.core.db import init_db
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Define allowed origins
ALLOWED_ORIGINS = ["http://localhost:8080", "http://localhost:8081", "http://localhost:5173"]

# CORS middleware - allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global exception handler to ensure CORS headers on all error responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    
    # Get origin from request
    origin = request.headers.get("origin", "")
    
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )
    
    # Add CORS headers manually for error responses
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

from fastapi.staticfiles import StaticFiles

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(patient.router, prefix="/api/v1/patient", tags=["Patient"])
app.include_router(appointments.router, prefix="/api/v1/appointments", tags=["Appointments"])
app.include_router(consultations.router, prefix="/api/v1/consultations", tags=["Consultations"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(master_admin.router, prefix="/api/v1/master", tags=["Master Admin"])
app.include_router(transcription.router, prefix="/api/v1/transcription", tags=["Transcription"])
app.include_router(frontdesk.router, prefix="/api/v1/frontdesk", tags=["Front Desk"])
app.include_router(medical_terms.router, prefix="/api/v1/medical-terms", tags=["Medical Terms"])


# Mount uploads directory to serve audio files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
def startup():
    logger.info("Starting NeuroAssist API server...")
    init_db()
    logger.info("Database initialized successfully")

@app.get("/health")
def health_check():
    return {"status": "ok"}
