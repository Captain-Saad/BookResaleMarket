"""Security headers on every API response (backend.md §5). `/docs` loads assets from a CDN, so
it's exempt from the strict content policy, and it isn't served in production."""

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
}
API_CONTENT_POLICY = "default-src 'none'; frame-ancestors 'none'"
HSTS_VALUE = "max-age=31536000; includeSubDomains"
DOCS_PATHS = {"/docs", "/docs/oauth2-redirect", "/openapi.json"}


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp, *, hsts: bool) -> None:
        self.app = app
        self.hsts = hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in SECURITY_HEADERS.items():
                    headers[name] = value
                if scope["path"] not in DOCS_PATHS:
                    headers["Content-Security-Policy"] = API_CONTENT_POLICY
                if self.hsts:
                    headers["Strict-Transport-Security"] = HSTS_VALUE
            await send(message)

        await self.app(scope, receive, send_with_headers)
