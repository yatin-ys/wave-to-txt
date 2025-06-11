import os
import json
from pathlib import Path

from backend.worker.celery_app import celery_app
from backend.core.redis_client import redis_client
from backend.core.config import settings
from groq import Groq

try:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment variables.")
    groq_client = Groq(api_key=settings.GROQ_API_KEY)
except Exception as e:
    print(f"Error initializing Groq client in worker: {e}")
    groq_client = None


@celery_app.task(name="process_transcription_task")
def process_transcription_task(file_path_str: str, task_id: str):
    """
    Celery task to transcribe audio, updating status in Redis.
    This version streams the file to the Groq API for low memory usage.
    """
    file_path = Path(file_path_str)

    if not redis_client:
        print(f"Task {task_id} failed: Redis client not available.")
        # We can't update status without redis, so just log and exit.
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
