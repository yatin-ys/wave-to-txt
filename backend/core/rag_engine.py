from typing import List, Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain.schema import Document

from backend.core.config import settings
from backend.core.logging_config import get_logger
from backend.core.vector_store import vector_store_manager

logger = get_logger("rag_engine")


class BasicRAGEngine:
    """
    Basic RAG engine for Phase 1 implementation.
    Provides simple question-answering over transcript and document content.
    """

    def __init__(self):
        self.llm = None
        self.qa_prompt = None
        self._initialize()

    def _initialize(self):
        """Initialize the RAG engine components."""
        try:
            if not settings.GOOGLE_API_KEY:
                raise ValueError("Google API key is required for RAG engine")

            # Initialize LLM
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.1,  # Low temperature for factual responses
            )

            # Initialize Q&A prompt template
            self.qa_prompt = ChatPromptTemplate.from_template(
                """You are an AI assistant that answers questions based on provided context from transcripts and documents.

Context Information:
{context}

Question: {question}

Instructions:
1. Answer the question based ONLY on the provided context
2. If the context doesn't contain enough information to answer the question, say "I don't have enough information in the provided context to answer this question."
3. When referencing specific information, mention the source (transcript speaker or document name)
4. Be concise but thorough in your response
5. If there are timestamps or speakers mentioned, include them in your answer

Answer:"""
            )

            logger.info(
                "RAG engine initialized successfully",
                extra={"model": "gemini-2.5-flash", "temperature": 0.1},
            )

        except Exception as e:
            logger.error(
                "Failed to initialize RAG engine",
                exc_info=True,
                extra={"error": str(e)},
            )
            raise

    def _format_context(self, documents: List[Document]) -> str:
        """Format retrieved documents into context string."""
        try:
            context_parts = []

            for i, doc in enumerate(documents, 1):
                metadata = doc.metadata
                source_info = ""

                # Add source information based on document type
                if metadata.get("document_type") == "transcript":
                    speaker = metadata.get("speaker", "Unknown Speaker")
                    utterance_idx = metadata.get("utterance_index", "")
                    source_info = f"[Transcript - Speaker: {speaker}"
                    if utterance_idx:
                        source_info += f", Part {utterance_idx + 1}"
                    source_info += "]"

                elif metadata.get("document_type") == "uploaded":
                    file_name = metadata.get("file_name", "Unknown Document")
                    page_num = metadata.get("page_number", "")
                    source_info = f"[Document: {file_name}"
                    if page_num:
                        source_info += f", Page {page_num}"
                    source_info += "]"

                else:
                    source_info = f"[Source {i}]"

                context_parts.append(f"{source_info}\n{doc.page_content}\n")

            context = "\n".join(context_parts)

            logger.debug(
                "Context formatted for RAG",
                extra={
                    "documents_count": len(documents),
                    "context_length": len(context),
                },
            )

            return context

        except Exception as e:
            logger.error(
                "Failed to format context", exc_info=True, extra={"error": str(e)}
            )
            raise

    async def ask_question(
        self, collection_name: str, question: str, top_k: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Ask a question and get an answer based on the collection's content.

        Args:
            collection_name: Name of the vector store collection
            question: User's question
            top_k: Number of documents to retrieve (defaults to settings)

        Returns:
            Dictionary with answer, sources, and metadata
        """
        try:
            # Ensure top_k is an integer
            k_value: int = (
                top_k
                if top_k is not None
                else getattr(settings, "RAG_TOP_K_RESULTS", 5)
            )

            # Ensure components are initialized
            if not self.qa_prompt or not self.llm:
                raise ValueError("RAG engine not properly initialized")

            logger.info(
                "Processing RAG question",
                extra={
                    "collection_name": collection_name,
                    "question_length": len(question),
                    "top_k": k_value,
                },
            )

            # Retrieve relevant documents
            relevant_docs = vector_store_manager.similarity_search(
                collection_name=collection_name, query=question, k=k_value
            )

            if not relevant_docs:
                return {
                    "answer": "I don't have any relevant information to answer this question. Please ensure your transcript or documents have been processed.",
                    "sources": [],
                    "context_used": "",
                    "success": True,
                }

            # Format context
            context = self._format_context(relevant_docs)

            # Create the full prompt (components are guaranteed to be not None now)
            chain = self.qa_prompt | self.llm | StrOutputParser()

            # Generate answer
            answer = await chain.ainvoke({"context": context, "question": question})

            # Extract source information
            sources = []
            for doc in relevant_docs:
                metadata = doc.metadata
                source_info = {
                    "type": metadata.get("document_type", "unknown"),
                    "content_preview": (
                        doc.page_content[:150] + "..."
                        if len(doc.page_content) > 150
                        else doc.page_content
                    ),
                }

                if metadata.get("document_type") == "transcript":
                    source_info.update(
                        {
                            "speaker": metadata.get("speaker"),
                            "utterance_index": metadata.get("utterance_index"),
                        }
                    )
                elif metadata.get("document_type") == "uploaded":
                    source_info.update(
                        {
                            "file_name": metadata.get("file_name"),
                            "page_number": metadata.get("page_number"),
                            "file_type": metadata.get("file_type"),
                        }
                    )

                sources.append(source_info)

            logger.info(
                "RAG question processed successfully",
                extra={
                    "collection_name": collection_name,
                    "question_length": len(question),
                    "answer_length": len(answer),
                    "sources_count": len(sources),
                    "documents_retrieved": len(relevant_docs),
                },
            )

            return {
                "answer": answer,
                "sources": sources,
                "context_used": context,
                "success": True,
            }

        except Exception as e:
            logger.error(
                "Failed to process RAG question",
                exc_info=True,
                extra={
                    "collection_name": collection_name,
                    "question": question[:100],  # Log first 100 chars
                    "error": str(e),
                },
            )

            return {
                "answer": f"I encountered an error while processing your question: {str(e)}",
                "sources": [],
                "context_used": "",
                "success": False,
                "error": str(e),
            }

    def get_suggested_questions(self, collection_name: str) -> List[str]:
        """
        Generate suggested questions based on the collection content.
        This is a simple implementation for Phase 1.
        """
        try:
            # Get collection stats to determine content type
            stats = vector_store_manager.get_collection_stats(collection_name)

            # Basic suggested questions - can be enhanced in later phases
            suggestions = [
                "What are the main topics discussed?",
                "What were the key decisions made?",
                "Who were the main participants?",
                "What action items were mentioned?",
                "Can you summarize the main points?",
            ]

            logger.debug(
                "Generated suggested questions",
                extra={
                    "collection_name": collection_name,
                    "suggestions_count": len(suggestions),
                },
            )

            return suggestions

        except Exception as e:
            logger.error(
                "Failed to generate suggested questions",
                exc_info=True,
                extra={"collection_name": collection_name, "error": str(e)},
            )
            return []


# Global instance
rag_engine = BasicRAGEngine()
