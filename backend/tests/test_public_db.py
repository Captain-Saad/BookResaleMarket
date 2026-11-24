import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import text

from app.core.config import Settings
from app.core.deps import DbDep, PublicDbDep
from app.main import create_app


def test_public_read_pool_does_not_change_private_transactions(database_url: str) -> None:
    settings = Settings(
        _env_file=None,
        env="test",
        database_url=database_url,
        database_direct_url=database_url,
        public_database_url=database_url,
    )
    app = create_app(settings)

    @app.get("/test/public")
    async def public_read(db: PublicDbDep) -> dict[str, bool]:
        a = await db.scalar(text("SELECT txid_current()"))
        b = await db.scalar(text("SELECT txid_current()"))
        return {"autocommit": a != b}

    @app.get("/test/private")
    async def private_read(db: DbDep) -> dict[str, bool]:
        a = await db.scalar(text("SELECT txid_current()"))
        b = await db.scalar(text("SELECT txid_current()"))
        return {"transactional": a == b}

    with TestClient(app) as client:
        assert client.get("/test/public").json() == {"autocommit": True}
        assert client.get("/test/private").json() == {"transactional": True}
        assert client.get("/api/v1/listings").status_code == 200
        assert client.get("/test/private").json() == {"transactional": True}


def test_missing_public_url_uses_original_transactional_pool(database_url: str) -> None:
    app = create_app(Settings(_env_file=None, env="test", database_url=database_url))

    @app.get("/test/fallback")
    async def read(db: PublicDbDep) -> dict[str, bool]:
        a = await db.scalar(text("SELECT txid_current()"))
        b = await db.scalar(text("SELECT txid_current()"))
        return {"transactional": a == b}

    with TestClient(app) as client:
        assert client.get("/test/fallback").json() == {"transactional": True}


def test_public_pool_rejects_supabase_transaction_mode() -> None:
    with pytest.raises(ValidationError, match="session pooler"):
        Settings(
            _env_file=None,
            env="test",
            public_database_url="postgresql://example@aws-0-test.pooler.supabase.com:6543/postgres",
        )
