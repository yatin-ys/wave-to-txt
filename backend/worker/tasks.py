import json
import requests
from botocore.exceptions import ClientError

from backend.worker.celery_app import celery_app
from backend.core.redis_client import redis_client
from backend.core.config import settings
from backend.core.summarizer import generate_summary
from backend.core.logging_config import get_logger
from groq import Groq

from backend.core.r2_client import r2_client, generate_presigned_url

logger = get_logger("tasks")

try:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment variables.")
    groq_client = Groq(api_key=settings.GROQ_API_KEY)
    logger.info("Groq client initialized successfully")
except Exception as e:
    logger.error(
        "Error initializing Groq client in worker",
        exc_info=True,
        extra={"error": str(e)},
    )
    groq_client = None


@celery_app.task(name="process_transcription_task")
def process_transcription_task(object_key: str, task_id: str, enable_diarization: bool):
    """
    Celery task to transcribe audio.
    - If diarization is disabled, it uses Groq for fast transcription.
    - If diarization is enabled, it uploads the file to AssemblyAI and uses a webhook.
    """
    if not redis_client:
        logger.error(
            "Task failed: Redis client not available", extra={"task_id": task_id}
        )
        return

    if not r2_client or not settings.R2_BUCKET_NAME:
        error_msg = "Object storage service (R2) not available in worker."
        logger.error(
            "Task failed: R2 not available",
            extra={"task_id": task_id, "error": error_msg},
        )
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
            logger.info(
                "Task dispatched to AssemblyAI for diarization",
                extra={
                    "task_id": task_id,
                    "object_key": object_key,
                    "transcript_id": response.json().get("id"),
                },
            )

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

            audio_url = generate_presigned_url(object_key)

            task_data = {
                "status": "completed",
                "utterances": utterances,
                "error": None,
                "audio_url": audio_url,
                "summary": None,
                "summary_status": "not_started",
                "summary_error": None,
            }
            redis_client.set(task_id, json.dumps(task_data))

            # Trigger vector store initialization for RAG functionality
            from backend.worker.rag_tasks import initialize_vector_store_task

            initialize_vector_store_task.delay(task_id)

            logger.info(
                "Groq transcription completed successfully",
                extra={
                    "task_id": task_id,
                    "object_key": object_key,
                    "transcript_length": len(transcription.text),
                    "audio_url_available": bool(audio_url),
                },
            )

    except Exception as e:
        error_message = f"Processing failed: {str(e)}"
        extra_data = {
            "task_id": task_id,
            "object_key": object_key,
            "enable_diarization": enable_diarization,
            "error": str(e),
        }

        if isinstance(e, requests.exceptions.HTTPError):
            error_message += f" - Response: {e.response.text}"
            extra_data["http_status"] = e.response.status_code
            extra_data["response_text"] = e.response.text

        logger.error("Transcription task failed", exc_info=True, extra=extra_data)
        task_data = {
            "status": "failed",
            "utterances": None,
            "error": error_message,
            "summary_status": "failed",
        }
        redis_client.set(task_id, json.dumps(task_data))


@celery_app.task(name="process_summarization_task")
def process_summarization_task(task_id: str):
    """
    Celery task to generate a summary from a completed transcription.
    """
    if not redis_client:
        logger.error(
            "Summarization failed: Redis client not available",
            extra={"task_id": task_id},
        )
        return

    try:
        task_json = redis_client.get(task_id)
        if not task_json:
            raise Exception("Task data not found in Redis.")

        assert isinstance(task_json, str)
        task_data = json.loads(task_json)

        if task_data.get("status") != "completed":
            raise Exception("Transcription is not complete, cannot summarize.")

        if not task_data.get("utterances"):
            raise Exception("No utterances found to summarize.")

        utterances = task_data.get("utterances", [])
        is_diarized = any(u.get("speaker") for u in utterances)

        transcript_parts = []
        for u in utterances:
            if u.get("speaker"):
                transcript_parts.append(f"Speaker {u['speaker']}: {u['text']}")
            else:
                transcript_parts.append(u["text"])
        full_transcript = "\\n".join(transcript_parts)

        summary = generate_summary(full_transcript, is_diarized=is_diarized)

        task_data["summary"] = summary
        task_data["summary_status"] = "completed"

        redis_client.set(task_id, json.dumps(task_data))
        logger.info(
            "Successfully generated summary",
            extra={
                "task_id": task_id,
                "summary_length": len(summary),
                "is_diarized": is_diarized,
                "utterance_count": len(utterances),
            },
        )

    except Exception as e:
        error_message = f"Summarization failed: {str(e)}"
        logger.error(
            "Summarization task failed",
            exc_info=True,
            extra={"task_id": task_id, "error": str(e)},
        )

        task_json = redis_client.get(task_id)
        if task_json:
            assert isinstance(task_json, str)
            task_data = json.loads(task_json)
            task_data["summary_status"] = "failed"
            task_data["summary_error"] = error_message
            redis_client.set(task_id, json.dumps(task_data))
