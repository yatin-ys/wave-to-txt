import redis
from .config import settings

from redis.exceptions import ConnectionError

try:
    redis_client: redis.Redis | None = redis.from_url(
        settings.REDIS_URL, decode_responses=True
    )

    redis_client.ping()
    print("Successfully connected to Redis.")

except ConnectionError as e:
    print(f"Error connecting to Redis: {e}")
    redis_client = None
