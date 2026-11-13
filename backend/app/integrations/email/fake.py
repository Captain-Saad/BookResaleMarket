"""Collects emails in memory, for tests."""

from app.integrations.email.base import EmailMessage


class FakeNotifier:
    def __init__(self) -> None:
        self.outbox: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> bool:
        self.outbox.append(message)
        return True
