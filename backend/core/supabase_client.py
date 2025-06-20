import os
from typing import Dict, List, Optional, Any
from supabase import create_client, Client
from backend.core.logging_config import get_logger

logger = get_logger(__name__)


class SupabaseClient:
    """Client for interacting with Supabase database."""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY"
        )  # Service role key for backend operations

        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

        self.client: Client = create_client(self.url, self.key)
        logger.info("Supabase client initialized successfully")

    async def save_transcription(
        self,
        user_id: str,
        task_id: str,
        title: str,
        original_filename: str,
        file_size: int,
        duration_seconds: Optional[int],
        transcription_engine: str,
        has_diarization: bool,
        transcript_text: str,
        utterances: List[Dict[str, Any]],
    ) -> str:
        """Save transcription to database."""
        try:
            data = {
                "id": task_id,  # Use task_id as the UUID
                "user_id": user_id,
                "title": title,
                "original_filename": original_filename,
                "file_size": file_size,
                "duration_seconds": duration_seconds,
                "transcription_engine": transcription_engine,
                "has_diarization": has_diarization,
                "transcript_text": transcript_text,
                "utterances": utterances,
                "status": "completed",
            }

            # Use upsert to handle duplicate keys gracefully
            result = self.client.table("transcriptions").upsert(data).execute()
            logger.info(f"Transcription saved/updated successfully: {task_id}")
            return task_id

        except Exception as e:
            logger.error(f"Error saving transcription: {e}")
            raise

    async def save_summary(
        self,
        user_id: str,
        transcription_id: str,
        summary_text: str,
        summary_type: str = "ai_generated",
    ) -> str:
        """Save summary to database. Updates existing summary if one exists."""
        try:
            # Check if summary already exists for this transcription
            existing_result = (
                self.client.table("summaries")
                .select("id")
                .eq("transcription_id", transcription_id)
                .eq("user_id", user_id)
                .eq("summary_type", summary_type)
                .execute()
            )

            if existing_result.data:
                # Update existing summary
                summary_id = existing_result.data[0]["id"]
                update_data = {
                    "summary_text": summary_text,
                    "updated_at": "NOW()",
                }
                self.client.table("summaries").update(update_data).eq(
                    "id", summary_id
                ).execute()
                logger.info(f"Summary updated successfully: {summary_id}")
                return summary_id
            else:
                # Insert new summary
                data = {
                    "transcription_id": transcription_id,
                    "user_id": user_id,
                    "summary_text": summary_text,
                    "summary_type": summary_type,
                }
                result = self.client.table("summaries").insert(data).execute()
                summary_id = result.data[0]["id"]
                logger.info(f"Summary saved successfully: {summary_id}")
                return summary_id

        except Exception as e:
            logger.error(f"Error saving summary: {e}")
            raise

    async def create_chat_session(self, user_id: str, transcription_id: str) -> str:
        """Create a new chat session."""
        try:
            data = {"transcription_id": transcription_id, "user_id": user_id}

            result = self.client.table("chat_sessions").insert(data).execute()
            session_id = result.data[0]["id"]
            logger.info(f"Chat session created: {session_id}")
            return session_id

        except Exception as e:
            logger.error(f"Error creating chat session: {e}")
            raise

    async def save_chat_message(
        self,
        user_id: str,
        chat_session_id: str,
        message_type: str,
        content: str,
        sources: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Save chat message to database."""
        try:
            data = {
                "chat_session_id": chat_session_id,
                "user_id": user_id,
                "message_type": message_type,
                "content": content,
                "sources": sources,
            }

            result = self.client.table("chat_messages").insert(data).execute()
            message_id = result.data[0]["id"]
            logger.info(f"Chat message saved: {message_id}")
            return message_id

        except Exception as e:
            logger.error(f"Error saving chat message: {e}")
            raise

    async def get_user_transcriptions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all transcriptions for a user."""
        try:
            result = (
                self.client.table("transcriptions")
                .select("*, summaries(*), chat_sessions(id, created_at)")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )

            logger.info(
                f"Retrieved {len(result.data)} transcriptions for user {user_id}"
            )
            return result.data

        except Exception as e:
            logger.error(f"Error retrieving transcriptions: {e}")
            raise

    async def get_transcription_details(
        self, user_id: str, transcription_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get detailed transcription with summary and chat history."""
        try:
            # Get transcription with summary
            transcription_result = (
                self.client.table("transcriptions")
                .select("*, summaries(*)")
                .eq("id", transcription_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )

            if not transcription_result.data:
                return None

            transcription = transcription_result.data

            # Get chat sessions and messages
            chat_result = (
                self.client.table("chat_sessions")
                .select("*, chat_messages(*)")
                .eq("transcription_id", transcription_id)
                .eq("user_id", user_id)
                .order("created_at", desc=False)
                .execute()
            )

            transcription["chat_sessions"] = chat_result.data

            logger.info(f"Retrieved transcription details: {transcription_id}")
            return transcription

        except Exception as e:
            logger.error(f"Error retrieving transcription details: {e}")
            raise

    async def update_transcription_title(
        self, user_id: str, transcription_id: str, new_title: str
    ) -> bool:
        """Update a transcription's title."""
        try:
            result = (
                self.client.table("transcriptions")
                .update({"title": new_title, "updated_at": "NOW()"})
                .eq("id", transcription_id)
                .eq("user_id", user_id)
                .execute()
            )

            if result.data:
                logger.info(f"Transcription title updated: {transcription_id}")
                return True
            else:
                logger.warning(
                    f"Transcription not found for title update: {transcription_id}"
                )
                return False

        except Exception as e:
            logger.error(f"Error updating transcription title: {e}")
            raise

    async def delete_transcription(self, user_id: str, transcription_id: str) -> bool:
        """Delete a transcription and all related data."""
        try:
            result = (
                self.client.table("transcriptions")
                .delete()
                .eq("id", transcription_id)
                .eq("user_id", user_id)
                .execute()
            )

            logger.info(f"Transcription deleted: {transcription_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting transcription: {e}")
            raise


# Global instance
supabase_client = None


def get_supabase_client() -> SupabaseClient:
    """Get or create Supabase client instance."""
    global supabase_client
    if supabase_client is None:
        supabase_client = SupabaseClient()
    return supabase_client
