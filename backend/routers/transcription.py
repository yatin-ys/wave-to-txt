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
    Response,
    status,
)
from pydantic import BaseModel
from backend.worker.tasks import process_transcription_task
from backend.core.redis_client import redis_client

router = APIRouter()

TEMP_AUDIO_DIR = Path("/app/temp_audio")


class TaskStatus(BaseModel):
    status: str
    transcript: str | None = None
    error: str | None = None


class TaskResponse(BaseModel):
    task_id: str


@router.post(
    "/transcribe", status_code=status.HTTP_202_ACCEPTED, response_model=TaskResponse
)
async def create_transcription(
    response: Response,
    audio_file: UploadFile = File(...),
):
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

    process_transcription_task.delay(str(temp_file_path), task_id)

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

    assert isinstance(task_json, str)

    return json.loads(task_json)
