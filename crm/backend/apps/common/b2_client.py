from __future__ import annotations

import boto3
from botocore.config import Config
from django.conf import settings


def get_b2_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.B2_ENDPOINT_URL,
        aws_access_key_id=settings.B2_KEY_ID,
        aws_secret_access_key=settings.B2_APP_KEY,
        region_name=settings.B2_REGION,
        config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
    )


def upload_public_object(key: str, body: bytes, content_type: str) -> str:
    if not settings.USE_B2_STORAGE:
        raise RuntimeError("B2 storage is not configured.")
    client = get_b2_client()
    client.put_object(
        Bucket=settings.B2_BUCKET_CRM,
        Key=key,
        Body=body,
        ContentType=content_type,
    )
    base = settings.B2_ENDPOINT_URL.rstrip("/")
    return f"{base}/{settings.B2_BUCKET_CRM}/{key}"
