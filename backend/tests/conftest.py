from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def client() -> Iterator[TestClient]:
    settings = Settings(_env_file=None, env="test", log_json=False)
    with TestClient(create_app(settings), raise_server_exceptions=False) as test_client:
        yield test_client
