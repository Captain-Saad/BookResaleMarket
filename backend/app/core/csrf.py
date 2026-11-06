"""Rejects state-changing requests from other sites: browsers always send `Origin` on them, and
cookies alone can't prove where a request came from (backend.md §5)."""

from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class OriginCheckMiddleware:
    def __init__(self, app: ASGIApp, allowed_origins: list[str]) -> None:
        self.app = app
        self.allowed_origins = set(allowed_origins)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["method"] not in SAFE_METHODS:
            origin = Headers(scope=scope).get("origin")
            if origin is not None and origin not in self.allowed_origins:
                response = JSONResponse(
                    {"title": "Forbidden", "status": 403, "code": "origin_not_allowed"},
                    status_code=403,
                    media_type="application/problem+json",
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)
