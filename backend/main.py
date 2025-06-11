from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from groq import Groq
import multipart  # This import is still useful to ensure the dependency is installed

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the Groq client
try:
    # FIX #1: The variable name is now correct.
    groq_client = Groq()
except Exception as e:
    print(f"Error initializing Groq client: {e}")
    groq_client = None


@app.get("/api/healthcheck")
async def healthcheck():
    """
    Health check endpoint to verify that the API is running.
    """
    return {"message": "API is running successfully!"}


# FIX #2: Changed from @app.get to @app.post to match the frontend request method.
@app.post("/api/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """
    Endpoint to transcribe an audio file using Groq's Whisper model.
    """
    if not groq_client:
        raise HTTPException(
            status_code=500, detail="Groq client not initialized. Check API key."
        )

    if not audio_file:
        raise HTTPException(status_code=400, detail="No audio file provided.")

    try:
        transcription = groq_client.audio.transcriptions.create(
            file=(audio_file.filename, audio_file.file.read()),
            model="whisper-large-v3",
        )
        return {"transcript": transcription.text}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to transcribe audio: {str(e)}"
        )
