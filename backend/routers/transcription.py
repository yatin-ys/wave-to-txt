import uuid
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
from botocore.exceptions import ClientError

from backend.worker.tasks import process_transcription_task
from backend.core.redis_client import redis_client

# Import the R2 client and settings
from backend.core.r2_client import r2_client
from backend.core.config import settings

router = APIRouter()


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
    if not r2_client or not settings.R2_BUCKET_NAME:
        raise HTTPException(
            status_code=503, detail="Object storage service (R2) not available."
        )

    task_id = str(uuid.uuid4())
    file_extension = (
        "".join(Path(audio_file.filename).suffixes) if audio_file.filename else ".tmp"
    )
    object_key = f"{task_id}{file_extension}"

    try:
        # Upload file directly to R2 by streaming its content.
        r2_client.upload_fileobj(
            Fileobj=audio_file.file,
            Bucket=settings.R2_BUCKET_NAME,
            Key=object_key,
        )
    except ClientError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to upload file to object storage: {e}"
        )
    finally:
        # Ensure the file handle is closed.
        await audio_file.close()

    initial_data = {"status": "pending", "transcript": None, "error": None}
    redis_client.set(task_id, json.dumps(initial_data))

    # Pass the R2 object_key to the Celery task, not a local file path.
    process_transcription_task.delay(object_key, task_id)

    response.headers["Location"] = f"/api/transcribe/status/{task_id}"
    return {"task_id": task_id}


async def event_generator(task_id: str, request: Request):
    if not redis_client:
        error_data = {"status": "failed", "error": "Redis connection not available."}
        yield f"data: {json.dumps(error_data)}\n\n"
        return

    while True:
        if await request.is_disconnected():
            break

        task_json = redis_client.get(task_id)
        if task_json:
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
    return StreamingResponse(
        event_generator(task_id, request), media_type="text/event-stream"
    )


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
