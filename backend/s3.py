"""AWS S3 helper utilities.

Provides a small helper to create an S3 bucket using the project's dependencies
(`boto3` is available in `backend/requirements.txt`). The function is safe to
call in tests (it raises `botocore` errors on failure) and returns the raw
client response on success.
"""
from typing import Optional
import logging

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def create_bucket(bucket_name: str, region: Optional[str] = None) -> dict:
    """Create an S3 bucket.

    Args:
        bucket_name: The name of the bucket to create.
        region: AWS region (e.g. 'us-west-2'). If None, defaults to client's
            default region (often us-east-1).

    Returns:
        The response dict returned by `create_bucket`.

    Raises:
        botocore.exceptions.ClientError: if the bucket cannot be created.
    """
    s3 = boto3.client("s3", region_name=region)
    try:
        if region is None or region == "us-east-1":
            resp = s3.create_bucket(Bucket=bucket_name)
        else:
            resp = s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": region},
            )
        logger.info("Created S3 bucket %s in region %s", bucket_name, region)
        return resp
    except ClientError:
        logger.exception("Failed to create S3 bucket %s", bucket_name)
        raise
