import uuid
import shutil
import os
import json
from pathlib import Path
from fastapi import (
    APIRouter,
    File,
    UploadFile,
    HTTPException,
    BackgroundTasks,
    Response,
    status,
)
from groq import Groq
from pydantic import BaseModel, Field

from backend.core.config import settings
from backend.core.redis_client import redis_client

# Initialize the API Router
router = APIRouter()

# Initialize the Groq client using the API key from settings
try:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment variables.")
    groq_client = Groq(api_key=settings.GROQ_API_KEY)
except Exception as e:
    print(f"Error initializing Groq client: {e}")
    groq_client = None

# Define the temporary storage directory relative to this file's location
SCRIPT_DIR = Path(__file__).parent.parent
TEMP_AUDIO_DIR = SCRIPT_DIR / "temp_audio"


class TaskStatus(BaseModel):
    status: str
    transcript: str | None = None
    error: str | None = None


class TaskResponse(BaseModel):
    task_id: str


def process_transcription_task(file_path: Path, task_id: str):
    """
    Background task to transcribe audio, updating status in Redis.
    This version streams the file to the Groq API for low memory usage.
    """
    if not redis_client:
        print(f"Task {task_id} failed: Redis client not available.")
        return
    try:
        if not groq_client:
            raise Exception("Groq client not initialized.")

        with open(file_path, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3",
            )

        task_data = {
            "status": "completed",
            "transcript": transcription.text,
            "error": None,
        }
        redis_client.set(task_id, json.dumps(task_data))

    except Exception as e:
        print(f"Task {task_id} failed: {e}")
        task_data = {
            "status": "failed",
            "transcript": None,
            "error": f"Transcription failed: {str(e)}",
        }
        redis_client.set(task_id, json.dumps(task_data))
    finally:
        try:
            os.remove(file_path)
        except OSError as e:
            print(f"Error removing temporary file {file_path}: {e}")


@router.post(
    "/transcribe", status_code=status.HTTP_202_ACCEPTED, response_model=TaskResponse
)
async def create_transcription(
    background_tasks: BackgroundTasks,
    response: Response,
    audio_file: UploadFile = File(...),
):
    if not groq_client:
        raise HTTPException(
            status_code=503, detail="Transcription service not available."
        )
    if not redis_client:
        raise HTTPException(
            status_code=503, detail="Task queue service (Redis) not available."
        )

    TEMP_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    task_id = str(uuid.uuid4())

    file_extension = (
        "".join(Path(audio_file.filename).suffixes) if audio_file.filename else ".tmp"
    )
    temp_file_path = TEMP_AUDIO_DIR / f"{task_id}{file_extension}"

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save temporary file: {e}"
        )
    finally:
        audio_file.file.close()

    initial_data = {"status": "pending", "transcript": None, "error": None}
    redis_client.set(task_id, json.dumps(initial_data))
    background_tasks.add_task(process_transcription_task, temp_file_path, task_id)

    response.headers["Location"] = f"/api/transcribe/status/{task_id}"
    return {"task_id": task_id}


@router.get("/transcribe/status/{task_id}", response_model=TaskStatus)
async def get_status(task_id: str):
    if not redis_client:
        raise HTTPException(
            status_code=503, detail="Task queue service (Redis) not available."
        )

    task_json = redis_client.get(task_id)
    if not task_json:
        raise HTTPException(status_code=404, detail="Task not found.")

    # --- FIX ---
    # Add an assertion to explicitly inform the type checker that `task_json`
    # is a string at this point, resolving the incorrect type inference.
    assert isinstance(task_json, str)

    return json.loads(task_json)
