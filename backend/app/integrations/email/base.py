"""The Notifier interface (backend.md §2). Modules depend on this, not on a mail provider."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    body: str


class Notifier(Protocol):
    async def send(self, message: EmailMessage) -> None: ...
