"""Sends email over SMTP: the local test inbox in development, a real provider later."""

import asyncio
import smtplib
from email.message import EmailMessage as MimeMessage

import structlog

from app.integrations.email.base import EmailMessage

logger = structlog.get_logger("email")

SMTP_TIMEOUT_SECONDS = 10


class SmtpNotifier:
    def __init__(self, host: str, port: int, sender: str) -> None:
        self.host = host
        self.port = port
        self.sender = sender

    def _send_blocking(self, message: EmailMessage) -> None:
        mime = MimeMessage()
        mime["From"] = self.sender
        mime["To"] = message.to
        mime["Subject"] = message.subject
        mime.set_content(message.body)
        with smtplib.SMTP(self.host, self.port, timeout=SMTP_TIMEOUT_SECONDS) as client:
            client.send_message(mime)

    async def send(self, message: EmailMessage) -> None:
        try:
            await asyncio.to_thread(self._send_blocking, message)
        except OSError as exc:
            logger.warning("email not sent", error=type(exc).__name__)
