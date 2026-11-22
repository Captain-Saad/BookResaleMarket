"""Simulate reservation for the S3 availability gate, outside production only."""

import argparse
import asyncio
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import SystemClock
from app.core.config import get_settings
from app.core.db import create_engine
from app.modules.listings.service import simulate_reservation


async def main(listing_id: UUID) -> None:
    settings = get_settings()
    if settings.is_production:
        raise SystemExit("Reservation simulation is disabled in production")
    url = settings.database_direct_url
    if url is None:
        raise SystemExit("BOOKLOOP_DATABASE_DIRECT_URL is not set")
    engine = create_engine(url.get_secret_value())
    try:
        async with AsyncSession(engine, expire_on_commit=False) as db:
            reserved = await simulate_reservation(db, SystemClock(), listing_id)
        if not reserved:
            raise SystemExit("No active listing found")
        print(f"Reserved {listing_id}; this simulates stock only, without creating an order")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("listing_id", type=UUID)
    asyncio.run(main(parser.parse_args().listing_id))
