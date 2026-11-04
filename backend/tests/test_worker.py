import asyncio

import pytest
from arq.worker import Worker

from app.core.config import Settings
from app.core.redis import create_redis_pool
from app.workers.tasks import heartbeat


def test_heartbeat_returns_ok() -> None:
    assert asyncio.run(heartbeat({"job_id": "test"})) == "ok"


async def _enqueue_and_run(redis_url: str) -> object:
    pool = await create_redis_pool(redis_url)
    job = await pool.enqueue_job("heartbeat")
    assert job is not None
    worker = Worker(
        functions=[heartbeat],
        redis_pool=pool,
        burst=True,
        poll_delay=0.1,
        handle_signals=False,
    )
    try:
        await worker.main()
        return await job.result(timeout=5)
    finally:
        await pool.aclose(close_connection_pool=True)


@pytest.mark.redis
def test_a_queued_job_runs_on_the_worker() -> None:
    redis_url = Settings(env="test").redis_url
    if redis_url is None:
        pytest.skip("BOOKLOOP_REDIS_URL is not set in backend/.env")
    assert asyncio.run(_enqueue_and_run(redis_url.get_secret_value())) == "ok"
