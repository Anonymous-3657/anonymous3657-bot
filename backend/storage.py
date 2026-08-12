"""Storage abstraction so the app is never coupled to one provider.

TODO(Step 4): implement R2/S3/GCS adapters + signed download URLs.
"""
import os
from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    def build_key(self, folder: str, filename: str) -> str: ...

    @abstractmethod
    async def signed_download_url(self, key: str, expires_in: int = 300) -> str: ...


class LocalStorageBackend(StorageBackend):
    """Development placeholder. Never returns a raw provider URL."""

    def build_key(self, folder: str, filename: str) -> str:
        return f"{folder.strip('/')}/{filename}"

    async def signed_download_url(self, key: str, expires_in: int = 300) -> str:
        raise NotImplementedError("Secure downloads are implemented in Step 4.")


_BACKENDS = {"local": LocalStorageBackend}


def get_storage() -> StorageBackend:
    provider = os.environ.get("STORAGE_PROVIDER", "local")
    return _BACKENDS.get(provider, LocalStorageBackend)()
