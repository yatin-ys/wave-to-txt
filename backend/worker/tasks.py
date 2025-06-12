import json
from botocore.exceptions import ClientError

from backend.worker.celery_app import celery_app
from backend.core.redis_client import redis_client
from backend.core.config import settings
from groq import Groq

# Import the R2 client
from backend.core.r2_client import r2_client

try:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment variables.")
    groq_client = Groq(api_key=settings.GROQ_API_KEY)
except Exception as e:
    print(f"Error initializing Groq client in worker: {e}")
    groq_client = None


@celery_app.task(name="process_transcription_task")
def process_transcription_task(object_key: str, task_id: str):
    """
    Celery task to transcribe audio from R2, updating status in Redis.
    The object in R2 will now be retained and managed by a Lifecycle Rule.
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
        if not groq_client:
            raise Exception("Groq client not initialized.")

        # Stream the file directly from R2.
        r2_object = r2_client.get_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
        audio_stream = r2_object["Body"]

        # Pass the stream directly to the Groq client.
        transcription = groq_client.audio.transcriptions.create(
            file=(object_key, audio_stream),
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
