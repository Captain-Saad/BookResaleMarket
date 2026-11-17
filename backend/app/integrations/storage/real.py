import asyncio
import re
from urllib.parse import quote, urlsplit

import httpx2

from app.core.errors import ServiceUnavailableError


class SupabasePhotoStorage:
    def __init__(self, url: str, key: str, bucket: str) -> None:
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or not parsed.hostname.endswith(".supabase.co")
            or parsed.username
            or parsed.password
            or parsed.port not in {None, 443}
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("Storage requires an HTTPS Supabase project URL")
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,63}", bucket):
            raise ValueError("Invalid private storage bucket")
        self.base = url.rstrip("/") + "/storage/v1"
        self.bucket = bucket
        self.headers = {"Authorization": f"Bearer {key}", "apikey": key}

    def _object(self, path: str) -> str:
        if path.startswith("/") or any(part in {".", ".."} for part in path.split("/")):
            raise ValueError("Invalid object path")
        return f"{self.bucket}/{quote(path, safe='/')}"

    async def _json(self, method: str, path: str, body: dict[str, object]) -> dict[str, str]:
        try:
            async with (
                asyncio.timeout(15),
                httpx2.AsyncClient(timeout=10, follow_redirects=False) as client,
            ):
                response = await client.request(
                    method, self.base + path, json=body, headers=self.headers
                )
                response.raise_for_status()
                if method == "DELETE":
                    return {}
                result: object = response.json()
                if not isinstance(result, dict):
                    raise ValueError("Invalid storage response")
                return {str(key): value for key, value in result.items() if isinstance(value, str)}
        except (httpx2.HTTPError, TimeoutError, ValueError):
            raise ServiceUnavailableError(code="storage_unavailable") from None

    async def upload_url(self, path: str) -> str:
        result = await self._json(
            "POST", f"/object/upload/sign/{self._object(path)}", {"upsert": False}
        )
        url = result.get("url", "")
        if not url.startswith("/object/upload/sign/"):
            raise ServiceUnavailableError(code="storage_unavailable")
        return self.base + url

    async def download(self, path: str, limit: int) -> bytes:
        try:
            async with (
                asyncio.timeout(15),
                httpx2.AsyncClient(timeout=10, follow_redirects=False) as client,
            ):
                async with client.stream(
                    "GET", f"{self.base}/object/{self._object(path)}", headers=self.headers
                ) as response:
                    response.raise_for_status()
                    result = bytearray()
                    async for chunk in response.aiter_bytes():
                        result.extend(chunk)
                        if len(result) > limit:
                            raise ValueError("Image exceeds size limit")
            return bytes(result)
        except (httpx2.HTTPError, TimeoutError):
            raise ServiceUnavailableError(code="storage_unavailable") from None

    async def store(self, path: str, data: bytes, content_type: str) -> None:
        try:
            async with httpx2.AsyncClient(timeout=15, follow_redirects=False) as client:
                response = await client.post(
                    f"{self.base}/object/{self._object(path)}",
                    content=data,
                    headers={**self.headers, "Content-Type": content_type, "x-upsert": "false"},
                )
                response.raise_for_status()
        except httpx2.HTTPError:
            raise ServiceUnavailableError(code="storage_unavailable") from None

    async def delete(self, path: str) -> None:
        await self._json("DELETE", f"/object/{self.bucket}", {"prefixes": [path]})

    async def read_url(self, path: str) -> str:
        result = await self._json("POST", f"/object/sign/{self._object(path)}", {"expiresIn": 600})
        url = result.get("signedURL", "")
        if not url.startswith("/object/sign/"):
            raise ServiceUnavailableError(code="storage_unavailable")
        return self.base + url
