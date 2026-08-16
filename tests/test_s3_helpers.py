import pytest
from unittest.mock import patch, MagicMock

from backend import s3


def test_create_bucket_default_region_calls_create_bucket_without_config():
    mock_client = MagicMock()
    mock_client.create_bucket.return_value = {"Response": "ok"}

    with patch("boto3.client", return_value=mock_client) as mock_boto:
        resp = s3.create_bucket("my-test-bucket")
        mock_boto.assert_called_once_with("s3", region_name=None)
        mock_client.create_bucket.assert_called_once_with(Bucket="my-test-bucket")
        assert resp == {"Response": "ok"}


def test_create_bucket_with_region_calls_create_bucket_with_location_constraint():
    mock_client = MagicMock()
    mock_client.create_bucket.return_value = {"Response": "ok"}

    with patch("boto3.client", return_value=mock_client) as mock_boto:
        resp = s3.create_bucket("my-test-bucket", region="us-west-2")
        mock_boto.assert_called_once_with("s3", region_name="us-west-2")
        mock_client.create_bucket.assert_called_once_with(
            Bucket="my-test-bucket",
            CreateBucketConfiguration={"LocationConstraint": "us-west-2"},
        )
        assert resp == {"Response": "ok"}


def test_create_bucket_propagates_client_error():
    from botocore.exceptions import ClientError

    mock_client = MagicMock()
    mock_client.create_bucket.side_effect = ClientError(
        {"Error": {"Code": "BucketAlreadyExists", "Message": "exists"}}, "CreateBucket"
    )

    with patch("boto3.client", return_value=mock_client):
        with pytest.raises(ClientError):
            s3.create_bucket("existing-bucket")
