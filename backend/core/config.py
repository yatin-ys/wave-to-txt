import os
import sys
from typing import List, Optional
from dotenv import load_dotenv

# Load environment before importing logging_config
load_dotenv()

# Import logging after environment is loaded
from .logging_config import get_logger

logger = get_logger("config")


class ConfigurationError(Exception):
    """Raised when there are configuration validation errors."""

    pass


class Settings:
    """
    Application settings, loaded and validated from environment variables.
    """

    def __init__(self):
        self._validation_errors: List[str] = []
        self._load_and_validate()

        if self._validation_errors:
            error_message = "Configuration validation failed:\n" + "\n".join(
                f"  - {error}" for error in self._validation_errors
            )
            raise ConfigurationError(error_message)

    def _load_and_validate(self):
        """Load and validate all environment variables."""

        # Core API settings
        self.GROQ_API_KEY: Optional[str] = self._get_env("GROQ_API_KEY")
        self.GOOGLE_API_KEY: Optional[str] = self._get_env("GOOGLE_API_KEY")

        # Server settings
        self.ALLOWED_ORIGINS: List[str] = self._get_env_list("ALLOWED_ORIGINS", "*")

        # Redis settings
        self.REDIS_URL: str = (
            self._get_env("REDIS_URL", "redis://localhost:6379/0")
            or "redis://localhost:6379/0"
        )
        self.CELERY_BROKER_URL: str = (
            self._get_env("CELERY_BROKER_URL", self.REDIS_URL) or self.REDIS_URL
        )
        self.CELERY_RESULT_BACKEND: str = (
            self._get_env("CELERY_RESULT_BACKEND", self.REDIS_URL) or self.REDIS_URL
        )

        # Cloudflare R2 settings
        self.R2_ENDPOINT_URL: Optional[str] = self._get_env("R2_ENDPOINT_URL")
        self.R2_ACCESS_KEY_ID: Optional[str] = self._get_env("R2_ACCESS_KEY_ID")
        self.R2_SECRET_ACCESS_KEY: Optional[str] = self._get_env("R2_SECRET_ACCESS_KEY")
        self.R2_BUCKET_NAME: Optional[str] = self._get_env("R2_BUCKET_NAME")

        # AssemblyAI settings
        self.ASSEMBLYAI_API_KEY: Optional[str] = self._get_env("ASSEMBLYAI_API_KEY")
        self.ASSEMBLYAI_WEBHOOK_SECRET: Optional[str] = self._get_env(
            "ASSEMBLYAI_WEBHOOK_SECRET"
        )
        self.BACKEND_BASE_URL: Optional[str] = self._get_env("BACKEND_BASE_URL")

        # Validate required settings
        self._validate_required_settings()
        self._validate_conditional_settings()
        self._validate_url_formats()

    def _get_env(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get environment variable with optional default."""
        value = os.getenv(key, default)
        return value.strip() if value else None

    def _get_env_list(self, key: str, default: str = "") -> List[str]:
        """Get environment variable as a list (comma-separated)."""
        value = self._get_env(key, default)
        if not value:
            return []
        return [item.strip() for item in value.split(",") if item.strip()]

    def _validate_required_settings(self):
        """Validate absolutely required environment variables."""

        # At least one transcription service must be configured
        if not self.GROQ_API_KEY and not self.ASSEMBLYAI_API_KEY:
            self._validation_errors.append(
                "At least one transcription service must be configured (GROQ_API_KEY or ASSEMBLYAI_API_KEY)"
            )

        # R2 storage is required for file uploads
        if not all(
            [
                self.R2_ENDPOINT_URL,
                self.R2_ACCESS_KEY_ID,
                self.R2_SECRET_ACCESS_KEY,
                self.R2_BUCKET_NAME,
            ]
        ):
            missing_r2_vars = []
            if not self.R2_ENDPOINT_URL:
                missing_r2_vars.append("R2_ENDPOINT_URL")
            if not self.R2_ACCESS_KEY_ID:
                missing_r2_vars.append("R2_ACCESS_KEY_ID")
            if not self.R2_SECRET_ACCESS_KEY:
                missing_r2_vars.append("R2_SECRET_ACCESS_KEY")
            if not self.R2_BUCKET_NAME:
                missing_r2_vars.append("R2_BUCKET_NAME")

            self._validation_errors.append(
                f"Cloudflare R2 storage is required. Missing: {', '.join(missing_r2_vars)}"
            )

    def _validate_conditional_settings(self):
        """Validate settings that depend on other settings."""

        # AssemblyAI webhook configuration (for diarization)
        if self.ASSEMBLYAI_API_KEY:
            if not self.ASSEMBLYAI_WEBHOOK_SECRET:
                self._validation_errors.append(
                    "ASSEMBLYAI_WEBHOOK_SECRET is required when ASSEMBLYAI_API_KEY is set"
                )
            if not self.BACKEND_BASE_URL:
                self._validation_errors.append(
                    "BACKEND_BASE_URL is required when ASSEMBLYAI_API_KEY is set for webhook callbacks"
                )

        # Google API key is required for summarization
        if not self.GOOGLE_API_KEY:
            self._validation_errors.append(
                "GOOGLE_API_KEY is required for transcript summarization features"
            )

    def _validate_url_formats(self):
        """Validate URL format for URL-based environment variables."""

        # Validate Redis URL format
        if self.REDIS_URL and not self.REDIS_URL.startswith(("redis://", "rediss://")):
            self._validation_errors.append(
                "REDIS_URL must start with 'redis://' or 'rediss://'"
            )

        # Validate R2 endpoint URL format
        if self.R2_ENDPOINT_URL and not self.R2_ENDPOINT_URL.startswith(
            ("http://", "https://")
        ):
            self._validation_errors.append(
                "R2_ENDPOINT_URL must start with 'http://' or 'https://'"
            )

        # Validate backend base URL format
        if self.BACKEND_BASE_URL and not self.BACKEND_BASE_URL.startswith(
            ("http://", "https://")
        ):
            self._validation_errors.append(
                "BACKEND_BASE_URL must start with 'http://' or 'https://'"
            )

    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a specific feature is enabled based on configuration."""
        feature_checks = {
            "groq_transcription": bool(self.GROQ_API_KEY),
            "assemblyai_transcription": bool(self.ASSEMBLYAI_API_KEY),
            "speaker_diarization": bool(
                self.ASSEMBLYAI_API_KEY
                and self.ASSEMBLYAI_WEBHOOK_SECRET
                and self.BACKEND_BASE_URL
            ),
            "summarization": bool(self.GOOGLE_API_KEY),
            "file_storage": bool(
                self.R2_ENDPOINT_URL
                and self.R2_ACCESS_KEY_ID
                and self.R2_SECRET_ACCESS_KEY
                and self.R2_BUCKET_NAME
            ),
        }
        return feature_checks.get(feature, False)

    def get_config_summary(self) -> dict:
        """Get a summary of the current configuration (without sensitive values)."""
        return {
            "features_enabled": {
                "groq_transcription": self.is_feature_enabled("groq_transcription"),
                "assemblyai_transcription": self.is_feature_enabled(
                    "assemblyai_transcription"
                ),
                "speaker_diarization": self.is_feature_enabled("speaker_diarization"),
                "summarization": self.is_feature_enabled("summarization"),
                "file_storage": self.is_feature_enabled("file_storage"),
            },
            "allowed_origins": self.ALLOWED_ORIGINS,
            "redis_url": self.REDIS_URL,
            "r2_configured": bool(self.R2_ENDPOINT_URL),
            "backend_base_url": self.BACKEND_BASE_URL,
        }


# Initialize settings and validate configuration
try:
    settings = Settings()
    logger.info("Configuration validation passed")
    logger.debug(
        "Configuration summary", extra={"config": settings.get_config_summary()}
    )
except ConfigurationError as e:
    logger.error("Configuration validation failed", extra={"error": str(e)})
    logger.info("Please check your environment variables and try again.")
    sys.exit(1)
except Exception as e:
    logger.error(
        "Unexpected error during configuration validation",
        exc_info=True,
        extra={"error": str(e)},
    )
    sys.exit(1)
