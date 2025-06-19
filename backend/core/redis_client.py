import redis
from .config import settings
from .logging_config import get_logger
from redis.exceptions import ConnectionError

logger = get_logger("redis_client")

try:
    redis_client: redis.Redis | None = redis.from_url(
        settings.REDIS_URL, decode_responses=True
    )

    redis_client.ping()
    logger.info(
        "Successfully connected to Redis",
        extra={
            "redis_url": (
                settings.REDIS_URL.split("@")[-1]
                if "@" in settings.REDIS_URL
                else settings.REDIS_URL
            )  # Hide credentials
        },
    )

except ConnectionError as e:
    logger.error(
        "Error connecting to Redis",
        exc_info=True,
        extra={
            "error": str(e),
            "redis_url": (
                settings.REDIS_URL.split("@")[-1]
                if "@" in settings.REDIS_URL
                else settings.REDIS_URL
            ),
        },
    )
    redis_client = None
