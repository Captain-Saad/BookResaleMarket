"""Seed demo copies for an existing verified seller, outside production only."""

import argparse
import asyncio
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import create_engine
from app.integrations.storage.base import PhotoStorage
from app.integrations.storage.fake import LocalPhotoStorage
from app.integrations.storage.real import SupabasePhotoStorage
from app.modules.listings.service import seed_listings


async def main(count: int) -> None:
    settings = get_settings()
    if settings.is_production:
        raise SystemExit("Demo seeding is disabled in production")
    url = settings.database_direct_url
    if url is None:
        raise SystemExit("BOOKLOOP_DATABASE_DIRECT_URL is not set")
    storage: PhotoStorage = (
        SupabasePhotoStorage(
            settings.storage_url,
            settings.storage_service_key.get_secret_value(),
            settings.storage_bucket,
        )
        if settings.storage_url and settings.storage_service_key
        else LocalPhotoStorage(Path("var/listing-photos"))
    )
    engine = create_engine(url.get_secret_value())
    try:
        async with AsyncSession(engine, expire_on_commit=False) as db:
            created = await seed_listings(db, count, storage=storage)
        print(f"Seeded {created} demo listings")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=500)
    asyncio.run(main(parser.parse_args().count))
