import boto3
from botocore.exceptions import ClientError
from .config import settings

r2_client = None

if (
    settings.R2_ENDPOINT_URL
    and settings.R2_ACCESS_KEY_ID
    and settings.R2_SECRET_ACCESS_KEY
    and settings.R2_BUCKET_NAME
):
    try:
        r2_client = boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT_URL,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )

        r2_client.head_bucket(Bucket=settings.R2_BUCKET_NAME)
        print("Successfully connected to Cloudflare R2.")

    except ClientError as e:
        print(f"Error connecting to Cloudflare R2: {e}")
        r2_client = None
    except Exception as e:
        print(f"An unexpected error occurred during R2 client initialization: {e}")
        r2_client = None
else:
    print("Cloudflare R2 settings are not fully configured; R2 client not initialized.")


def generate_presigned_url(object_key: str, expiration: int = 43200) -> str | None:
    """
    Generates a pre-signed URL to share an R2 object.

    Args:
        object_key: The key of the object in the R2 bucket.
        expiration: Time in seconds for the pre-signed URL to remain valid.
                    Defaults to 43200 (12 hours).

    Returns:
        The pre-signed URL as a string, or None if an error occurs.
    """
    if not r2_client:
        print("R2 client not initialized. Cannot generate pre-signed URL.")
        return None

    try:
        url = r2_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.R2_BUCKET_NAME, "Key": object_key},
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        print(f"Error generating pre-signed URL: {e}")
        return None
