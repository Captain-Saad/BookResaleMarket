"""ARQ worker entry point. Run with: uv run arq app.workers.settings.WorkerSettings"""

from typing import Any

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.redis import redis_settings
from app.workers.tasks import heartbeat

_settings = get_settings()
_redis_url = _settings.redis_url
if _redis_url is None:
    raise RuntimeError("BOOKLOOP_REDIS_URL is not set")
REDIS_SETTINGS = redis_settings(_redis_url.get_secret_value())


async def startup(ctx: dict[str, Any]) -> None:
    configure_logging(_settings.log_level, _settings.log_json)


class WorkerSettings:
    functions = (heartbeat,)
    redis_settings = REDIS_SETTINGS
    on_startup = startup
