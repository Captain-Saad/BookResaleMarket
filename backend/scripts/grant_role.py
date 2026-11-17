"""Gives a user a role, such as the first admin. There's deliberately no API for this, so nobody
can promote themselves.

Run from backend/: uv run python -m scripts.grant_role someone@example.com admin
"""

import argparse
import asyncio

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.core.clock import SystemClock
from app.core.config import get_settings
from app.core.db import create_engine
from app.modules.identity import service
from app.modules.identity.models import Role


async def grant_role(engine: AsyncEngine, email: str, role: Role) -> bool:
    async with AsyncSession(engine, expire_on_commit=False) as db:
        return await service.grant_role(db, SystemClock(), email=email, role=role)


async def _main(email: str, role: Role) -> None:
    url = get_settings().database_direct_url
    if url is None:
        raise SystemExit("BOOKLOOP_DATABASE_DIRECT_URL is not set")
    engine = create_engine(url.get_secret_value())
    try:
        granted = await grant_role(engine, email.strip().lower(), role)
    finally:
        await engine.dispose()
    if not granted:
        raise SystemExit(f"No account found for {email}")
    print(f"{email} now has the {role} role")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email")
    parser.add_argument("role", type=Role, choices=list(Role))
    arguments = parser.parse_args()
    asyncio.run(_main(arguments.email, arguments.role))
