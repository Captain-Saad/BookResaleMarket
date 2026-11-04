"""Background jobs run by the ARQ worker. Real jobs (webhooks, emails, expiry) arrive per slice."""

from typing import Any

import structlog

logger = structlog.get_logger("worker")


async def heartbeat(ctx: dict[str, Any]) -> str:
    """Proves the enqueue → Redis → worker → result round trip."""
    logger.info("heartbeat", job_id=ctx.get("job_id"))
    return "ok"
