"""Starts a check without calling anyone. Results are recorded by the dev console or by tests."""

from uuid import UUID


class FakeSellerVerificationProvider:
    async def start(self, user_id: UUID) -> str:
        return f"fake-{user_id}"
