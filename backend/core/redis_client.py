import redis
from .config import settings

# --- FIX: Import ConnectionError directly from redis ---
from redis.exceptions import ConnectionError

# Initialize the Redis client from the URL in settings
# `decode_responses=True` makes the client return strings instead of bytes.
try:
    # --- FIX: Add a specific type hint for the client ---
    # This helps Pylance and other tools understand exactly what this object is.
    redis_client: redis.Redis | None = redis.from_url(
        settings.REDIS_URL, decode_responses=True
    )

    # Test the connection on startup
    redis_client.ping()
    print("Successfully connected to Redis.")

# --- FIX: Use the correct exception class path ---
except ConnectionError as e:
    print(f"Error connecting to Redis: {e}")
    redis_client = None
