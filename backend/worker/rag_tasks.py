import json
from typing import List, Dict, Any

from backend.worker.celery_app import celery_app
from backend.core.redis_client import redis_client
from backend.core.vector_store import vector_store_manager
from backend.core.logging_config import get_logger

logger = get_logger("rag_tasks")


@celery_app.task(name="initialize_vector_store_task")
def initialize_vector_store_task(task_id: str):
    """
    Celery task to initialize vector store with transcript data.
    This runs asynchronously after transcription completion.
    """
    try:
        if not redis_client:
            logger.error(
                "Vector store initialization failed: Redis client not available",
                extra={"task_id": task_id},
            )
            return

        # Get task data from Redis
        task_json = redis_client.get(task_id)
        if not task_json:
            logger.error(
                "Vector store initialization failed: Task data not found",
                extra={"task_id": task_id},
            )
            return

        assert isinstance(task_json, str)
        task_data = json.loads(task_json)

        # Check if transcription is completed
        if task_data.get("status") != "completed":
            logger.warning(
                "Vector store initialization skipped: Transcription not completed",
                extra={"task_id": task_id, "status": task_data.get("status")},
            )
            return

        utterances = task_data.get("utterances")
        if not utterances:
            logger.warning(
                "Vector store initialization skipped: No utterances found",
                extra={"task_id": task_id},
            )
            return

        # Create collection name based on task_id
        collection_name = f"chat_{task_id}"

        # Add transcript to vector store
        chunks_created = vector_store_manager.add_transcript_to_collection(
            collection_name=collection_name, utterances=utterances, task_id=task_id
        )

        # Create chat session data in Redis
        chat_session_data = {
            "task_id": task_id,
            "collection_name": collection_name,
            "initialized": True,
            "transcript_chunks": chunks_created,
            "uploaded_documents": [],
            "auto_initialized": True,  # Flag to indicate automatic initialization
        }
        redis_client.set(f"chat_session_{task_id}", json.dumps(chat_session_data))

        # Update the main task data to indicate RAG is ready
        task_data["rag_ready"] = True
        task_data["rag_collection"] = collection_name
        task_data["rag_chunks"] = chunks_created
        redis_client.set(task_id, json.dumps(task_data))

        logger.info(
            "Vector store initialized successfully for transcript",
            extra={
                "task_id": task_id,
                "collection_name": collection_name,
                "chunks_created": chunks_created,
                "utterances_count": len(utterances),
            },
        )

    except Exception as e:
        logger.error(
            "Vector store initialization task failed",
            exc_info=True,
            extra={"task_id": task_id, "error": str(e)},
        )

        # Try to update task data to indicate RAG failed
        try:
            if redis_client:
                task_json = redis_client.get(task_id)
                if task_json:
                    assert isinstance(task_json, str)
                    task_data = json.loads(task_json)
                    task_data["rag_ready"] = False
                    task_data["rag_error"] = str(e)
                    redis_client.set(task_id, json.dumps(task_data))
        except Exception as update_error:
            logger.error(
                "Failed to update task data with RAG error",
                exc_info=True,
                extra={"task_id": task_id, "update_error": str(update_error)},
            )


@celery_app.task(name="process_document_for_rag_task")
def process_document_for_rag_task(
    task_id: str, file_path: str, file_name: str, file_type: str
):
    """
    Celery task to process an uploaded document and add it to the vector store.
    This could be used for larger documents that need async processing.
    """
    try:
        if not redis_client:
            logger.error(
                "Document processing failed: Redis client not available",
                extra={"task_id": task_id, "file_name": file_name},
            )
            return

        # Check if chat session exists
        session_json = redis_client.get(f"chat_session_{task_id}")
        if not session_json:
            logger.error(
                "Document processing failed: Chat session not found",
                extra={"task_id": task_id, "file_name": file_name},
            )
            return

        assert isinstance(session_json, str)
        session_data = json.loads(session_json)
        collection_name = session_data.get("collection_name")

        if not collection_name:
            logger.error(
                "Document processing failed: Invalid session data",
                extra={"task_id": task_id, "file_name": file_name},
            )
            return

        # This is a placeholder for future async document processing
        # For now, document processing is handled synchronously in the API
        # But this task structure is ready for when we need async processing

        logger.info(
            "Document processing task completed",
            extra={
                "task_id": task_id,
                "file_name": file_name,
                "file_type": file_type,
                "collection_name": collection_name,
            },
        )

    except Exception as e:
        logger.error(
            "Document processing task failed",
            exc_info=True,
            extra={"task_id": task_id, "file_name": file_name, "error": str(e)},
        )
