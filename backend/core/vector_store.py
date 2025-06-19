import os
import pickle
from typing import List, Optional, Dict, Any
from pathlib import Path
import time
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pydantic import SecretStr

from backend.core.config import settings
from backend.core.logging_config import get_logger

logger = get_logger("vector_store")


class VectorStoreManager:
    """
    Manages FAISS vector database for RAG functionality.
    Uses FAISS + Google embeddings - much lighter than ChromaDB.
    """

    def __init__(self):
        self.embeddings = None
        self.text_splitter = None
        self.db_path = None
        self._initialize()

    def _initialize(self):
        """Initialize the vector store components with retry logic."""
        max_retries = 3
        retry_delay = 2

        for attempt in range(max_retries):
            try:
                if not settings.GOOGLE_API_KEY:
                    raise ValueError("Google API key is required for embeddings")

                # Initialize embeddings
                self.embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001",
                    google_api_key=SecretStr(settings.GOOGLE_API_KEY),
                )

                # Initialize text splitter
                self.text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=getattr(settings, "RAG_CHUNK_SIZE", 1000),
                    chunk_overlap=getattr(settings, "RAG_CHUNK_OVERLAP", 200),
                    length_function=len,
                    separators=["\n\n", "\n", ". ", " ", ""],
                )

                # Initialize FAISS database path
                vector_db_path = getattr(settings, "CHROMA_DB_PATH", "./chroma_db")
                os.makedirs(vector_db_path, exist_ok=True)
                self.db_path = vector_db_path

                logger.info(
                    "FAISS vector store initialized successfully",
                    extra={
                        "db_path": self.db_path,
                        "chunk_size": getattr(settings, "RAG_CHUNK_SIZE", 1000),
                        "chunk_overlap": getattr(settings, "RAG_CHUNK_OVERLAP", 200),
                        "attempt": attempt + 1,
                    },
                )
                return  # Success, exit retry loop

            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(
                        f"Vector store initialization failed, retrying in {retry_delay}s",
                        extra={
                            "attempt": attempt + 1,
                            "max_retries": max_retries,
                            "error": str(e),
                        },
                    )
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.error(
                        "Failed to initialize vector store after all retries",
                        exc_info=True,
                        extra={"error": str(e), "attempts": max_retries},
                    )
                    raise

    def get_or_create_collection(self, collection_name: str) -> FAISS:
        """Get or create a FAISS collection for a specific session."""
        try:
            if not self.db_path or not self.embeddings:
                raise ValueError("Vector store not initialized")

            collection_path = os.path.join(self.db_path, f"{collection_name}.faiss")

            # Try to load existing FAISS index
            if os.path.exists(collection_path):
                try:
                    vector_store = FAISS.load_local(
                        collection_path,
                        self.embeddings,
                        allow_dangerous_deserialization=True,
                    )
                    logger.debug(f"Loaded existing FAISS collection: {collection_name}")
                    return vector_store
                except Exception as e:
                    logger.warning(
                        f"Failed to load existing collection, creating new: {e}"
                    )

            # Create new empty FAISS index with a dummy document
            dummy_doc = Document(page_content="dummy", metadata={"dummy": True})
            vector_store = FAISS.from_documents([dummy_doc], self.embeddings)

            # Remove the dummy document
            vector_store.delete([vector_store.index_to_docstore_id[0]])

            # Save the empty index
            vector_store.save_local(collection_path)

            logger.debug(
                "FAISS collection created",
                extra={"collection_name": collection_name},
            )

            return vector_store

        except Exception as e:
            logger.error(
                "Failed to get/create collection",
                exc_info=True,
                extra={"collection_name": collection_name, "error": str(e)},
            )
            raise

    def add_transcript_to_collection(
        self, collection_name: str, utterances: List[Dict[str, Any]], task_id: str
    ) -> int:
        """Add transcript utterances to the vector store."""
        try:
            if not self.text_splitter:
                raise ValueError("Text splitter not initialized")

            vector_store = self.get_or_create_collection(collection_name)

            # Convert utterances to documents
            documents = []
            for i, utterance in enumerate(utterances):
                speaker = utterance.get("speaker", "Unknown")
                text = utterance.get("text", "")

                if not text.strip():
                    continue

                # Create document with metadata
                doc = Document(
                    page_content=text,
                    metadata={
                        "source": "transcript",
                        "task_id": task_id,
                        "speaker": speaker,
                        "utterance_index": i,
                        "document_type": "transcript",
                    },
                )
                documents.append(doc)

            if not documents:
                logger.warning(
                    "No valid utterances to add to vector store",
                    extra={"task_id": task_id, "collection_name": collection_name},
                )
                return 0

            # Split documents into chunks
            chunks = self.text_splitter.split_documents(documents)

            # Add chunks to FAISS vector store
            if chunks:
                vector_store.add_documents(chunks)

                # Save the updated index
                if self.db_path:
                    collection_path = os.path.join(
                        self.db_path, f"{collection_name}.faiss"
                    )
                    vector_store.save_local(collection_path)

            logger.info(
                "Transcript added to vector store",
                extra={
                    "task_id": task_id,
                    "collection_name": collection_name,
                    "utterances_count": len(utterances),
                    "chunks_created": len(chunks),
                },
            )

            return len(chunks)

        except Exception as e:
            logger.error(
                "Failed to add transcript to vector store",
                exc_info=True,
                extra={
                    "task_id": task_id,
                    "collection_name": collection_name,
                    "error": str(e),
                },
            )
            raise

    def add_document_to_collection(
        self, collection_name: str, document: Document, file_name: str, file_type: str
    ) -> int:
        """Add a processed document to the vector store."""
        try:
            if not self.text_splitter:
                raise ValueError("Text splitter not initialized")

            vector_store = self.get_or_create_collection(collection_name)

            # Update document metadata
            document.metadata.update(
                {
                    "source": "uploaded_document",
                    "file_name": file_name,
                    "file_type": file_type,
                    "document_type": "uploaded",
                }
            )

            # Split document into chunks
            chunks = self.text_splitter.split_documents([document])

            # Add chunks to FAISS vector store
            if chunks:
                vector_store.add_documents(chunks)

                # Save the updated index
                if self.db_path:
                    collection_path = os.path.join(
                        self.db_path, f"{collection_name}.faiss"
                    )
                    vector_store.save_local(collection_path)

            logger.info(
                "Document added to vector store",
                extra={
                    "collection_name": collection_name,
                    "file_name": file_name,
                    "file_type": file_type,
                    "chunks_created": len(chunks),
                },
            )

            return len(chunks)

        except Exception as e:
            logger.error(
                "Failed to add document to vector store",
                exc_info=True,
                extra={
                    "collection_name": collection_name,
                    "file_name": file_name,
                    "error": str(e),
                },
            )
            raise

    def similarity_search(
        self, collection_name: str, query: str, k: Optional[int] = None
    ) -> List[Document]:
        """Perform similarity search in the vector store."""
        try:
            k_value = k if k is not None else getattr(settings, "RAG_TOP_K_RESULTS", 5)

            vector_store = self.get_or_create_collection(collection_name)
            results = vector_store.similarity_search(query, k=k_value)

            logger.debug(
                "Similarity search completed",
                extra={
                    "collection_name": collection_name,
                    "query_length": len(query),
                    "results_count": len(results),
                    "k": k_value,
                },
            )

            return results

        except Exception as e:
            logger.error(
                "Failed to perform similarity search",
                exc_info=True,
                extra={
                    "collection_name": collection_name,
                    "query": query[:100],  # Log first 100 chars
                    "error": str(e),
                },
            )
            raise

    def delete_collection(self, collection_name: str) -> bool:
        """Delete a collection from the vector store."""
        try:
            if not self.db_path:
                return False
            collection_path = os.path.join(self.db_path, f"{collection_name}.faiss")

            # Remove FAISS index file
            if os.path.exists(collection_path):
                os.remove(collection_path)

            # Remove pickle file
            pkl_path = f"{collection_path}.pkl"
            if os.path.exists(pkl_path):
                os.remove(pkl_path)

            logger.info(
                "Collection deleted successfully",
                extra={"collection_name": collection_name},
            )

            return True

        except Exception as e:
            logger.error(
                "Failed to delete collection",
                exc_info=True,
                extra={"collection_name": collection_name, "error": str(e)},
            )
            return False

    def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """Get statistics about a collection."""
        try:
            vector_store = self.get_or_create_collection(collection_name)

            # Count documents in FAISS index
            document_count = vector_store.index.ntotal if vector_store.index else 0

            stats = {
                "document_count": document_count,
                "collection_name": collection_name,
            }

            logger.debug("Collection stats retrieved", extra=stats)

            return stats

        except Exception as e:
            logger.error(
                "Failed to get collection stats",
                exc_info=True,
                extra={"collection_name": collection_name, "error": str(e)},
            )
            return {"document_count": 0, "collection_name": collection_name}


# Global instance
vector_store_manager = VectorStoreManager()
