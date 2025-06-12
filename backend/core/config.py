import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """
    Application settings, loaded from environment variables.
    """

    GROQ_API_KEY: str | None = os.getenv("GROQ_API_KEY")
    ALLOWED_ORIGINS: list[str] = os.getenv("ALLOWED_ORIGINS", "*").split(",")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", REDIS_URL)
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)
    R2_ENDPOINT_URL: str | None = os.getenv("R2_ENDPOINT_URL")
    R2_ACCESS_KEY_ID: str | None = os.getenv("R2_ACCESS_KEY_ID")
    R2_SECRET_ACCESS_KEY: str | None = os.getenv("R2_SECRET_ACCESS_KEY")
    R2_BUCKET_NAME: str | None = os.getenv("R2_BUCKET_NAME")


settings = Settings()
