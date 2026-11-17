"""Seller identity checks behind an interface. A real provider such as Stripe Connect replaces
the fake without changing the API (backend.md M1)."""

from typing import Protocol
from uuid import UUID


class SellerVerificationProvider(Protocol):
    async def start(self, user_id: UUID) -> str:
        """Starts a check and returns the provider's reference for it."""
        ...
