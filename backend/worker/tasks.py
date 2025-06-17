import json
import requests
from botocore.exceptions import ClientError

from backend.worker.celery_app import celery_app
from backend.core.redis_client import redis_client
from backend.core.config import settings
from groq import Groq

from backend.core.r2_client import r2_client

try:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment variables.")
    groq_client = Groq(api_key=settings.GROQ_API_KEY)
except Exception as e:
    print(f"Error initializing Groq client in worker: {e}")
    groq_client = None


@celery_app.task(name="process_transcription_task")
def process_transcription_task(object_key: str, task_id: str, enable_diarization: bool):
    """
    Celery task to transcribe audio.
    - If diarization is disabled, it uses Groq for fast transcription.
    - If diarization is enabled, it uploads the file to AssemblyAI and uses a webhook.
    """
    if not redis_client:
        print(f"Task {task_id} failed: Redis client not available.")
        return

    if not r2_client or not settings.R2_BUCKET_NAME:
        error_msg = "Object storage service (R2) not available in worker."
        print(f"Task {task_id} failed: {error_msg}")
        task_data = {"status": "failed", "error": error_msg}
        redis_client.set(task_id, json.dumps(task_data))
        return

    try:
        if enable_diarization:
            if not all(
                [
                    settings.ASSEMBLYAI_API_KEY,
                    settings.BACKEND_BASE_URL,
                    settings.ASSEMBLYAI_WEBHOOK_SECRET,
                ]
            ):
                raise Exception(
                    "AssemblyAI settings (API Key, Backend URL, Webhook Secret) are not fully configured."
                )

            r2_object = r2_client.get_object(
                Bucket=settings.R2_BUCKET_NAME, Key=object_key
            )
            audio_stream = r2_object["Body"]

            upload_headers = {"authorization": settings.ASSEMBLYAI_API_KEY}
            upload_response = requests.post(
                "https://api.assemblyai.com/v2/upload",
                headers=upload_headers,
                data=audio_stream,
            )
            upload_response.raise_for_status()
            upload_url = upload_response.json()["upload_url"]

            assert (
                settings.BACKEND_BASE_URL is not None
            ), "BACKEND_BASE_URL cannot be None here."
            base_url = settings.BACKEND_BASE_URL.strip("/")
            webhook_url = f"{base_url}/api/webhooks/assemblyai?task_id={task_id}"

            transcript_headers = {
                "authorization": settings.ASSEMBLYAI_API_KEY,
                "content-type": "application/json",
            }
            payload = {
                "audio_url": upload_url,
                "speaker_labels": True,
                "webhook_url": webhook_url,
            }

            if settings.ASSEMBLYAI_WEBHOOK_SECRET:
                payload["webhook_auth_header_name"] = "X-Webhook-Secret"
                payload["webhook_auth_header_value"] = (
                    settings.ASSEMBLYAI_WEBHOOK_SECRET
                )

            response = requests.post(
                "https://api.assemblyai.com/v2/transcript",
                json=payload,
                headers=transcript_headers,
            )
            response.raise_for_status()
            print(f"Task {task_id} dispatched to AssemblyAI.")

        else:
            if not groq_client:
                raise Exception("Groq client not initialized.")

            r2_object = r2_client.get_object(
                Bucket=settings.R2_BUCKET_NAME, Key=object_key
            )
            audio_stream = r2_object["Body"]
            transcription = groq_client.audio.transcriptions.create(
                file=(object_key, audio_stream.read()), model="whisper-large-v3"
            )
            utterances = [{"speaker": None, "text": transcription.text}]
            task_data = {
                "status": "completed",
                "utterances": utterances,
                "error": None,
            }
            redis_client.set(task_id, json.dumps(task_data))

    except Exception as e:
        error_message = f"Processing failed: {str(e)}"
        if isinstance(e, requests.exceptions.HTTPError):
            error_message += f" - Response: {e.response.text}"

        print(f"Task {task_id} failed: {error_message}")
        task_data = {
            "status": "failed",
            "utterances": None,
            "error": error_message,
        }
        redis_client.set(task_id, json.dumps(task_data))
