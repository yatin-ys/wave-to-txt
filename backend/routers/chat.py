import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel

from backend.core.rag_engine import rag_engine
from backend.core.vector_store import vector_store_manager
from backend.core.document_processor import document_processor
from backend.core.redis_client import redis_client
from backend.core.logging_config import get_logger

logger = get_logger("chat_router")

router = APIRouter()


class ChatQuestion(BaseModel):
    question: str
    top_k: Optional[int] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    context_used: str
    success: bool
    error: Optional[str] = None


class KnowledgeBaseStats(BaseModel):
    document_count: int
    collection_name: str
    has_transcript: bool
    uploaded_documents: List[Dict[str, Any]]


class DocumentUploadResponse(BaseModel):
    success: bool
    message: str
    file_name: str
    chunks_created: int
    error: Optional[str] = None


@router.post("/chat/{task_id}/initialize", status_code=status.HTTP_201_CREATED)
async def initialize_knowledge_base(task_id: str):
    """
    Initialize the knowledge base for a specific transcript task.
    This creates the vector store collection and adds the transcript content.
    """
    try:
        if not redis_client:
            raise HTTPException(
                status_code=503, detail="Task queue service (Redis) not available."
            )

        # Get task data from Redis
        task_json = redis_client.get(task_id)
        if not task_json:
            raise HTTPException(status_code=404, detail="Transcript task not found.")

        assert isinstance(task_json, str)
        task_data = json.loads(task_json)

        # Check if transcription is completed
        if task_data.get("status") != "completed":
            raise HTTPException(
                status_code=400,
                detail="Transcription must be completed before initializing chat.",
            )

        utterances = task_data.get("utterances")
        if not utterances:
            raise HTTPException(status_code=400, detail="No transcript content found.")

        # Create collection name based on task_id
        collection_name = f"chat_{task_id}"

        # Add transcript to vector store
        chunks_created = vector_store_manager.add_transcript_to_collection(
            collection_name=collection_name, utterances=utterances, task_id=task_id
        )

        # Store chat session info in Redis
        chat_session_data = {
            "task_id": task_id,
            "collection_name": collection_name,
            "initialized": True,
            "transcript_chunks": chunks_created,
            "uploaded_documents": [],
        }
        redis_client.set(f"chat_session_{task_id}", json.dumps(chat_session_data))

        logger.info(
            "Knowledge base initialized successfully",
            extra={
                "task_id": task_id,
                "collection_name": collection_name,
                "chunks_created": chunks_created,
            },
        )

        return {
            "message": "Knowledge base initialized successfully",
            "collection_name": collection_name,
            "transcript_chunks": chunks_created,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to initialize knowledge base",
            exc_info=True,
            extra={"task_id": task_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to initialize knowledge base: {str(e)}"
        )


@router.post("/chat/{task_id}/ask", response_model=ChatResponse)
async def ask_question(task_id: str, question_data: ChatQuestion):
    """
    Ask a question about the transcript and uploaded documents.
    """
    try:
        if not redis_client:
            raise HTTPException(
                status_code=503, detail="Task queue service (Redis) not available."
            )

        # Check if chat session exists
        session_json = redis_client.get(f"chat_session_{task_id}")
        if not session_json:
            raise HTTPException(
                status_code=404,
                detail="Chat session not found. Please initialize the knowledge base first.",
            )

        assert isinstance(session_json, str)
        session_data = json.loads(session_json)
        collection_name = session_data.get("collection_name")

        if not collection_name:
            raise HTTPException(status_code=500, detail="Invalid chat session data.")

        # Ask the question using RAG engine
        result = await rag_engine.ask_question(
            collection_name=collection_name,
            question=question_data.question,
            top_k=question_data.top_k,
        )

        logger.info(
            "Question processed",
            extra={
                "task_id": task_id,
                "question_length": len(question_data.question),
                "answer_length": len(result["answer"]),
                "sources_count": len(result["sources"]),
            },
        )

        return ChatResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to process question",
            exc_info=True,
            extra={
                "task_id": task_id,
                "question": question_data.question[:100],
                "error": str(e),
            },
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to process question: {str(e)}"
        )


@router.post("/chat/{task_id}/upload-document", response_model=DocumentUploadResponse)
async def upload_document(task_id: str, document: UploadFile = File(...)):
    """
    Upload and process a supplementary document (PDF, DOCX, TXT) for the chat session.
    """
    try:
        if not redis_client:
            raise HTTPException(
                status_code=503, detail="Task queue service (Redis) not available."
            )

        # Check if chat session exists
        session_json = redis_client.get(f"chat_session_{task_id}")
        if not session_json:
            raise HTTPException(
                status_code=404,
                detail="Chat session not found. Please initialize the knowledge base first.",
            )

        assert isinstance(session_json, str)
        session_data = json.loads(session_json)
        collection_name = session_data.get("collection_name")

        if not collection_name:
            raise HTTPException(status_code=500, detail="Invalid chat session data.")

        # Process the document
        file_content = await document.read()
        processed_doc = document_processor.process_uploaded_file(
            file_content=file_content, filename=document.filename or "unknown"
        )

        if not processed_doc:
            raise HTTPException(
                status_code=400,
                detail="No content could be extracted from the document.",
            )

        # Add document to the vector store
        total_chunks = vector_store_manager.add_document_to_collection(
            collection_name=collection_name,
            document=processed_doc,
            file_name=document.filename or "unknown",
            file_type=getattr(document, "content_type", "unknown"),
        )

        # Update session data
        uploaded_doc_info = {
            "file_name": document.filename,
            "chunks_created": total_chunks,
            "upload_timestamp": "now",  # Could use actual timestamp
        }
        session_data["uploaded_documents"].append(uploaded_doc_info)
        redis_client.set(f"chat_session_{task_id}", json.dumps(session_data))

        logger.info(
            "Document uploaded and processed successfully",
            extra={
                "task_id": task_id,
                "file_name": document.filename,
                "chunks_created": total_chunks,
                "documents_processed": 1,
            },
        )

        return DocumentUploadResponse(
            success=True,
            message="Document uploaded and processed successfully",
            file_name=document.filename or "unknown",
            chunks_created=total_chunks,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to upload document",
            exc_info=True,
            extra={
                "task_id": task_id,
                "file_name": getattr(document, "filename", "unknown"),
                "error": str(e),
            },
        )
        return DocumentUploadResponse(
            success=False,
            message=f"Failed to process document: {str(e)}",
            file_name=getattr(document, "filename", "unknown"),
            chunks_created=0,
            error=str(e),
        )


@router.get("/chat/{task_id}/stats", response_model=KnowledgeBaseStats)
async def get_knowledge_base_stats(task_id: str):
    """
    Get statistics about the knowledge base for a chat session.
    """
    try:
        if not redis_client:
            raise HTTPException(
                status_code=503, detail="Task queue service (Redis) not available."
            )

        # Check if chat session exists
        session_json = redis_client.get(f"chat_session_{task_id}")
        if not session_json:
            raise HTTPException(status_code=404, detail="Chat session not found.")

        assert isinstance(session_json, str)
        session_data = json.loads(session_json)
        collection_name = session_data.get("collection_name")

        if not collection_name:
            raise HTTPException(status_code=500, detail="Invalid chat session data.")

        # Get vector store stats
        stats = vector_store_manager.get_collection_stats(collection_name)

        return KnowledgeBaseStats(
            document_count=stats["document_count"],
            collection_name=collection_name,
            has_transcript=bool(session_data.get("transcript_chunks", 0)),
            uploaded_documents=session_data.get("uploaded_documents", []),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get knowledge base stats",
            exc_info=True,
            extra={"task_id": task_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.get("/chat/{task_id}/suggestions")
async def get_suggested_questions(task_id: str):
    """
    Get suggested questions for the chat session.
    """
    try:
        if not redis_client:
            raise HTTPException(
                status_code=503, detail="Task queue service (Redis) not available."
            )

        # Check if chat session exists
        session_json = redis_client.get(f"chat_session_{task_id}")
        if not session_json:
            raise HTTPException(status_code=404, detail="Chat session not found.")

        assert isinstance(session_json, str)
        session_data = json.loads(session_json)
        collection_name = session_data.get("collection_name")

        if not collection_name:
            raise HTTPException(status_code=500, detail="Invalid chat session data.")

        # Get suggested questions
        suggestions = rag_engine.get_suggested_questions(collection_name)

        logger.debug(
            "Suggested questions retrieved",
            extra={"task_id": task_id, "suggestions_count": len(suggestions)},
        )

        return {"suggestions": suggestions}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get suggested questions",
            exc_info=True,
            extra={"task_id": task_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to get suggestions: {str(e)}"
        )


@router.delete("/chat/{task_id}")
async def delete_chat_session(task_id: str):
    """
    Delete a chat session and its associated vector store collection.
    """
    try:
        if not redis_client:
            raise HTTPException(
                status_code=503, detail="Task queue service (Redis) not available."
            )

        # Check if chat session exists
        session_json = redis_client.get(f"chat_session_{task_id}")
        if not session_json:
            raise HTTPException(status_code=404, detail="Chat session not found.")

        assert isinstance(session_json, str)
        session_data = json.loads(session_json)
        collection_name = session_data.get("collection_name")

        # Delete vector store collection
        if collection_name:
            vector_store_manager.delete_collection(collection_name)

        # Delete session data from Redis
        redis_client.delete(f"chat_session_{task_id}")

        logger.info(
            "Chat session deleted successfully",
            extra={"task_id": task_id, "collection_name": collection_name},
        )

        return {"message": "Chat session deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to delete chat session",
            exc_info=True,
            extra={"task_id": task_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to delete chat session: {str(e)}"
        )
