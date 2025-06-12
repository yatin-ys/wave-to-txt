import boto3
from botocore.exceptions import ClientError
from .config import settings

# This module initializes and configures the Boto3 client for Cloudflare R2.

r2_client = None

# Check if all necessary R2 settings are provided in the environment.
if (
    settings.R2_ENDPOINT_URL
    and settings.R2_ACCESS_KEY_ID
    and settings.R2_SECRET_ACCESS_KEY
    and settings.R2_BUCKET_NAME
):
    try:
        # The standard 's3' client is used for all S3-compatible services like R2.
        r2_client = boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT_URL,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",  # 'auto' is the correct region for R2
        )

        # Verify the connection by checking if the bucket exists.
        # This will raise an exception if credentials or endpoint are wrong.
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
