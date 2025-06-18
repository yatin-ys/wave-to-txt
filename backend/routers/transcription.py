import uuid
import json
import asyncio
import requests
from pathlib import Path
from fastapi import (
    APIRouter,
    File,
    UploadFile,
    HTTPException,
    Response,
    status,
    Request,
    Form,
    Header,
)
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from botocore.exceptions import ClientError

from backend.worker.tasks import process_transcription_task
from backend.core.redis_client import redis_client

from backend.core.r2_client import r2_client, generate_presigned_url
from backend.core.config import settings

router = APIRouter()


class Utterance(BaseModel):
    speaker: str | None
    text: str


class TaskStatus(BaseModel):
    status: str
    utterances: list[Utterance] | None = None
    error: str | None = None
    audio_url: str | None = None


class TaskResponse(BaseModel):
    task_id: str


@router.post(
    "/transcribe", status_code=status.HTTP_202_ACCEPTED, response_model=TaskResponse
)
async def create_transcription(
    response: Response,
    audio_file: UploadFile = File(...),
    enable_diarization: bool = Form(False),
):
    if not redis_client:
        raise HTTPException(
            status_code=503, detail="Task queue service (Redis) not available."
        )
    if not r2_client or not settings.R2_BUCKET_NAME:
        raise HTTPException(
            status_code=503, detail="Object storage service (R2) not available."
        )

    if enable_diarization and (
        not settings.ASSEMBLYAI_API_KEY
        or not settings.BACKEND_BASE_URL
        or not settings.ASSEMBLYAI_WEBHOOK_SECRET
    ):
        raise HTTPException(
            status_code=503,
            detail="Diarization service is not configured. Missing AssemblyAI credentials, webhook secret, or backend URL.",
        )

    task_id = str(uuid.uuid4())
    file_extension = (
        "".join(Path(audio_file.filename).suffixes) if audio_file.filename else ".tmp"
    )
    object_key = f"{task_id}{file_extension}"

    try:
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
        await audio_file.close()

    initial_data = {
        "status": "pending",
        "utterances": None,
        "error": None,
        "audio_url": None,
        "object_key": object_key,
    }
    redis_client.set(task_id, json.dumps(initial_data))

    process_transcription_task.delay(object_key, task_id, enable_diarization)

    response.headers["Location"] = f"/api/transcribe/status/{task_id}"
    return {"task_id": task_id}


class AssemblyAIWebhookPayload(BaseModel):
    transcript_id: str
    status: str
    error: str | None = None


@router.post("/webhooks/assemblyai")
async def assemblyai_webhook(
    task_id: str,
    payload: AssemblyAIWebhookPayload,
    x_webhook_secret: str = Header(None, alias="X-Webhook-Secret"),
):
    if not redis_client:
        print("Webhook received but Redis is not available.")
        return JSONResponse(
            content={"message": "Acknowledged, but internal error occurred."},
            status_code=200,
        )

    if settings.ASSEMBLYAI_WEBHOOK_SECRET:
        if (
            not x_webhook_secret
            or x_webhook_secret != settings.ASSEMBLYAI_WEBHOOK_SECRET
        ):
            print(f"Invalid webhook secret for task_id: {task_id}")
            raise HTTPException(status_code=403, detail="Invalid webhook secret.")

    if payload.status == "completed":
        try:
            transcript_endpoint = (
                f"https://api.assemblyai.com/v2/transcript/{payload.transcript_id}"
            )
            headers = {"authorization": settings.ASSEMBLYAI_API_KEY}

            response = requests.get(transcript_endpoint, headers=headers)
            response.raise_for_status()
            transcript_data = response.json()

            task_json = redis_client.get(task_id)
            if not task_json:
                print(f"Task {task_id} not found in Redis for webhook completion.")
                final_data = {
                    "status": "completed",
                    "utterances": transcript_data.get("utterances", []),
                    "error": None,
                    "audio_url": None,
                }
                redis_client.set(task_id, json.dumps(final_data))
                return JSONResponse(
                    content={"message": "Webhook received, but task data lost."},
                    status_code=200,
                )

            assert isinstance(task_json, str)
            current_task_data = json.loads(task_json)
            object_key = current_task_data.get("object_key")

            audio_url = None
            if object_key:
                audio_url = generate_presigned_url(object_key)

            final_data = {
                "status": "completed",
                "utterances": transcript_data.get("utterances", []),
                "error": None,
                "audio_url": audio_url,
            }
            redis_client.set(task_id, json.dumps(final_data))

        except requests.exceptions.RequestException as e:
            print(
                f"Failed to fetch transcript {payload.transcript_id} from AssemblyAI: {e}"
            )
            error_data = {
                "status": "failed",
                "error": "Failed to retrieve transcript data after completion.",
            }
            redis_client.set(task_id, json.dumps(error_data))

    elif payload.status == "error":
        final_data = {
            "status": "failed",
            "utterances": None,
            "error": payload.error
            or "AssemblyAI processing failed with an unknown error.",
            "audio_url": None,
        }
        redis_client.set(task_id, json.dumps(final_data))

    return JSONResponse(
        content={"message": "Webhook received successfully."}, status_code=200
    )


async def event_generator(task_id: str, request: Request):
    if not redis_client:
        error_data = {"status": "failed", "error": "Redis connection not available."}
        yield f"data: {json.dumps(error_data)}\n\n"
        return

    while True:
        if await request.is_disconnected():
            print(f"Client disconnected for task_id: {task_id}")
            break

        task_json = redis_client.get(task_id)
        if task_json:
            assert isinstance(task_json, str)
            task_data = json.loads(task_json)
            task_data.pop("object_key", None)
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
    task_data = json.loads(task_json)
    task_data.pop("object_key", None)
    return task_data
