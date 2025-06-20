from fastapi import APIRouter, HTTPException, Header, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import jwt
import os
import base64
from backend.core.supabase_client import get_supabase_client, SupabaseClient
from backend.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/history", tags=["history"])


# Pydantic models for request/response
class TranscriptionCreate(BaseModel):
    task_id: str
    title: str
    original_filename: str
    file_size: int
    duration_seconds: Optional[int] = None
    transcription_engine: str
    has_diarization: bool
    transcript_text: str
    utterances: List[Dict[str, Any]]


class SummaryCreate(BaseModel):
    transcription_id: str
    summary_text: str
    summary_type: str = "ai_generated"


class ChatMessageCreate(BaseModel):
    chat_session_id: str
    message_type: str  # 'user' or 'assistant'
    content: str
    sources: Optional[List[Dict[str, Any]]] = None


class TranscriptionResponse(BaseModel):
    id: str
    title: str
    original_filename: str
    file_size: int
    duration_seconds: Optional[int]
    transcription_engine: str
    has_diarization: bool
    created_at: str
    has_summary: bool
    has_chat: bool


# Improved JWT token verification for Supabase
async def verify_jwt_token(authorization: str = Header(None)) -> str:
    """Verify Supabase JWT token and extract user ID."""
    if not authorization:
        logger.warning("Missing authorization header")
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        # Remove 'Bearer ' prefix
        if not authorization.startswith("Bearer "):
            logger.warning(f"Invalid authorization format: {authorization[:20]}...")
            raise HTTPException(status_code=401, detail="Invalid authorization format")

        token = authorization[7:]  # Remove 'Bearer ' (7 characters)

        # Get Supabase JWT secret
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret:
            logger.error("SUPABASE_JWT_SECRET not configured")
            raise HTTPException(status_code=500, detail="JWT secret not configured")

        # Handle base64-encoded JWT secrets (common for Supabase)
        try:
            # Try to decode as base64 first
            decoded_secret = base64.b64decode(jwt_secret)
            logger.debug("Using base64-decoded JWT secret")
            secret_to_use = decoded_secret
        except Exception:
            # If not base64, use as-is
            logger.debug("Using JWT secret as-is (not base64)")
            secret_to_use = jwt_secret

        # Verify and decode token with Supabase-specific settings
        try:
            payload = jwt.decode(
                token,
                secret_to_use,
                algorithms=["HS256"],
                # Supabase-specific options
                options={
                    "verify_aud": False,  # Disable audience verification for now
                    "verify_iss": False,  # Disable issuer verification for now
                },
            )
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")

        # Extract user ID
        user_id = payload.get("sub")
        if not user_id:
            logger.warning(f"Missing user ID in token payload: {payload}")
            raise HTTPException(status_code=401, detail="Invalid token payload")

        logger.debug(f"Successfully verified token for user: {user_id}")
        return user_id

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in JWT verification: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")


@router.post("/transcriptions")
async def save_transcription(
    transcription: TranscriptionCreate,
    user_id: str = Depends(verify_jwt_token),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """Save a completed transcription to history."""
    try:
        logger.info(f"Saving transcription for user {user_id}: {transcription.title}")
        result = await supabase.save_transcription(
            user_id=user_id,
            task_id=transcription.task_id,
            title=transcription.title,
            original_filename=transcription.original_filename,
            file_size=transcription.file_size,
            duration_seconds=transcription.duration_seconds,
            transcription_engine=transcription.transcription_engine,
            has_diarization=transcription.has_diarization,
            transcript_text=transcription.transcript_text,
            utterances=transcription.utterances,
        )
        logger.info(f"Transcription saved successfully: {result}")
        return {"id": result, "message": "Transcription saved successfully"}
    except Exception as e:
        logger.error(f"Error saving transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summaries")
async def save_summary(
    summary: SummaryCreate,
    user_id: str = Depends(verify_jwt_token),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """Save a summary to history."""
    try:
        logger.info(f"Saving summary for user {user_id}: {summary.transcription_id}")
        result = await supabase.save_summary(
            user_id=user_id,
            transcription_id=summary.transcription_id,
            summary_text=summary.summary_text,
            summary_type=summary.summary_type,
        )
        logger.info(f"Summary saved successfully: {result}")
        return {"id": result, "message": "Summary saved successfully"}
    except Exception as e:
        logger.error(f"Error saving summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat-sessions")
async def create_chat_session(
    transcription_id: str,
    user_id: str = Depends(verify_jwt_token),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """Create a new chat session for a transcription."""
    try:
        logger.info(f"Creating chat session for user {user_id}: {transcription_id}")
        result = await supabase.create_chat_session(
            user_id=user_id, transcription_id=transcription_id
        )
        logger.info(f"Chat session created successfully: {result}")
        return {"id": result, "message": "Chat session created successfully"}
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat-messages")
async def save_chat_message(
    message: ChatMessageCreate,
    user_id: str = Depends(verify_jwt_token),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """Save a chat message to history."""
    try:
        logger.info(f"Saving chat message for user {user_id}: {message.message_type}")
        result = await supabase.save_chat_message(
            user_id=user_id,
            chat_session_id=message.chat_session_id,
            message_type=message.message_type,
            content=message.content,
            sources=message.sources,
        )
        logger.info(f"Chat message saved successfully: {result}")
        return {"id": result, "message": "Chat message saved successfully"}
    except Exception as e:
        logger.error(f"Error saving chat message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transcriptions")
async def get_transcriptions(
    user_id: str = Depends(verify_jwt_token),
    supabase: SupabaseClient = Depends(get_supabase_client),
) -> List[TranscriptionResponse]:
    """Get all transcriptions for the authenticated user."""
    try:
        logger.info(f"Fetching transcriptions for user {user_id}")
        transcriptions = await supabase.get_user_transcriptions(user_id)

        # Transform data for response
        result = []
        for t in transcriptions:
            result.append(
                TranscriptionResponse(
                    id=t["id"],
                    title=t["title"],
                    original_filename=t["original_filename"],
                    file_size=t["file_size"],
                    duration_seconds=t["duration_seconds"],
                    transcription_engine=t["transcription_engine"],
                    has_diarization=t["has_diarization"],
                    created_at=t["created_at"],
                    has_summary=len(t.get("summaries", [])) > 0,
                    has_chat=len(t.get("chat_sessions", [])) > 0,
                )
            )

        logger.info(f"Returning {len(result)} transcriptions for user {user_id}")
        return result
    except Exception as e:
        logger.error(f"Error retrieving transcriptions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transcriptions/{transcription_id}")
async def get_transcription_details(
    transcription_id: str,
    user_id: str = Depends(verify_jwt_token),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """Get detailed transcription with summary and chat history."""
    try:
        logger.info(
            f"Fetching transcription details for user {user_id}: {transcription_id}"
        )
        transcription = await supabase.get_transcription_details(
            user_id, transcription_id
        )

        if not transcription:
            logger.warning(
                f"Transcription not found: {transcription_id} for user {user_id}"
            )
            raise HTTPException(status_code=404, detail="Transcription not found")

        logger.info(f"Returning transcription details: {transcription_id}")
        return transcription
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Error retrieving transcription details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/transcriptions/{transcription_id}")
async def delete_transcription(
    transcription_id: str,
    user_id: str = Depends(verify_jwt_token),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """Delete a transcription and all related data."""
    try:
        logger.info(f"Deleting transcription for user {user_id}: {transcription_id}")
        result = await supabase.delete_transcription(user_id, transcription_id)

        if not result:
            logger.warning(f"Transcription not found for deletion: {transcription_id}")
            raise HTTPException(status_code=404, detail="Transcription not found")

        logger.info(f"Transcription deleted successfully: {transcription_id}")
        return {"message": "Transcription deleted successfully"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Error deleting transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))
