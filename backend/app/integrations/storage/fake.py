import asyncio
from pathlib import Path

from app.core.errors import NotFoundError


class LocalPhotoStorage:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)

    def _path(self, path: str) -> Path:
        result = (self.root / path).resolve()
        if not result.is_relative_to(self.root) or result == self.root:
            raise ValueError("Invalid storage path")
        return result

    async def upload_url(self, path: str) -> None:
        return None

    async def download(self, path: str, limit: int) -> bytes:
        file = self._path(path)
        try:
            if file.stat().st_size > limit:
                raise ValueError("Image exceeds size limit")
            return await asyncio.to_thread(file.read_bytes)
        except FileNotFoundError:
            raise NotFoundError(code="photo_not_uploaded") from None

    async def store(self, path: str, data: bytes, content_type: str) -> None:
        file = self._path(path)
        file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with file.open("xb") as target:
            target.write(data)

    async def delete(self, path: str) -> None:
        self._path(path).unlink(missing_ok=True)

    async def read_url(self, path: str) -> None:
        return None
