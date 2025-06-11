from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.routers import transcription

# Initialize the main FastAPI application
app = FastAPI(
    title="WaveToTxt API",
    description="API for transcribing audio files asynchronously.",
    version="1.0.0",
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the transcription router
# All routes defined in that file will be added under the /api prefix
app.include_router(transcription.router, prefix="/api")


# Add a simple health check endpoint at the root
@app.get("/api/healthcheck", tags=["Health"])
async def healthcheck():
    """
    Health check endpoint to verify that the API is running.
    """
    return {"status": "ok", "message": "API is running successfully"}
