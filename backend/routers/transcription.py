import uuid
import shutil
import os
import json
import asyncio
from pathlib import Path
from fastapi import (
    APIRouter,
    File,
    UploadFile,
    HTTPException,
    Response,
    status,
    Request,
)
from fastapi.responses import StreamingResponse
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


async def event_generator(task_id: str, request: Request):
    """
    Yields server-sent events with the transcription status.
    """
    if not redis_client:
        error_data = {
            "status": "failed",
            "error": "Redis connection not available.",
        }
        yield f"data: {json.dumps(error_data)}\n\n"
        return

    while True:
        if await request.is_disconnected():
            print(f"Client disconnected for task {task_id}")
            break

        task_json = redis_client.get(task_id)

        if task_json:
            # FIX: Add assertion to guide the type checker.
            assert isinstance(task_json, str)
            task_data = json.loads(task_json)
            yield f"data: {json.dumps(task_data)}\n\n"

            if task_data["status"] in ["completed", "failed"]:
                break
        else:
            not_found_data = {"status": "failed", "error": "Task not found."}
            yield f"data: {json.dumps(not_found_data)}\n\n"
            break

        await asyncio.sleep(2)


@router.get("/transcribe/stream-status/{task_id}")
async def stream_status(task_id: str, request: Request):
    """
    Endpoint to stream transcription status using Server-Sent Events (SSE).
    """
    return StreamingResponse(
        event_generator(task_id, request), media_type="text/event-stream"
    )


@router.get("/transcribe/status/{task_id}", response_model=TaskStatus)
async def get_status(task_id: str):
    """
    A standard REST endpoint to get the current status of a task once.
    """
    if not redis_client:
        raise HTTPException(
            status_code=503, detail="Task queue service (Redis) not available."
        )

    task_json = redis_client.get(task_id)
    if not task_json:
        raise HTTPException(status_code=404, detail="Task not found.")

    # FIX: Add assertion to guide the type checker.
    assert isinstance(task_json, str)
    return json.loads(task_json)
