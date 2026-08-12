"""Private object storage (Emergent object storage).

Files are never exposed through a provider URL — every read goes through the API
so authorization is enforced on our side.
"""
import logging
import os
import re

import requests

logger = logging.getLogger(__name__)

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or \
    "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "cg-student-portal"
BUCKET_PREFIX = f"{APP_NAME}/student-pdfs"

_storage_key = None


def _key() -> str:
    return os.environ.get("EMERGENT_LLM_KEY", "")


def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": _key()}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def build_path(user_id: str, file_id: str) -> str:
    safe_user = re.sub(r"[^a-zA-Z0-9]", "", user_id)
    return f"{BUCKET_PREFIX}/{safe_user}/{file_id}.pdf"


def put_object(path: str, data: bytes, content_type: str = "application/pdf") -> dict:
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": init_storage(), "Content-Type": content_type},
        data=data,
        timeout=180,
    )
    if resp.status_code == 404:
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": init_storage(force=True), "Content-Type": content_type},
            data=data,
            timeout=180,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": init_storage()},
        timeout=120,
    )
    if resp.status_code == 404:
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": init_storage(force=True)},
            timeout=120,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/pdf")
