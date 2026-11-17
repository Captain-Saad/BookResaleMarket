"""Rejects oversized request bodies before they're read into memory. `Content-Length` can be
missing or false, so the bytes that actually arrive are counted too."""

from http import HTTPStatus

from starlette.datastructures import Headers
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

PAYLOAD_TOO_LARGE = int(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)


class RequestSizeLimitMiddleware:
    def __init__(self, app: ASGIApp, *, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    def _declared_too_large(self, scope: Scope) -> bool:
        declared = Headers(scope=scope).get("content-length", "")
        return declared.isdigit() and int(declared) > self.max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        if self._declared_too_large(scope):
            response = JSONResponse(
                {"title": "Payload Too Large", "status": 413, "code": "payload_too_large"},
                status_code=PAYLOAD_TOO_LARGE,
                media_type="application/problem+json",
            )
            await response(scope, receive, send)
            return

        received = 0

        async def counting_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise HTTPException(status_code=PAYLOAD_TOO_LARGE)
            return message

        await self.app(scope, counting_receive, send)
