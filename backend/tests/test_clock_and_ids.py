from datetime import UTC, datetime, timedelta, timezone

import pytest

from app.core.clock import FrozenClock, SystemClock
from app.core.ids import uuid7, uuid7_unix_ms


def test_uuid7_has_version_7_and_rfc_variant() -> None:
    value = uuid7()
    assert value.version == 7
    assert value.variant == "specified in RFC 4122"


def test_uuid7_embeds_its_creation_time() -> None:
    assert uuid7_unix_ms(uuid7(unix_ms=1_760_000_000_000)) == 1_760_000_000_000


def test_uuid7_sorts_by_creation_time() -> None:
    earlier, later = uuid7(unix_ms=1_000), uuid7(unix_ms=2_000)
    assert earlier < later
    assert len({uuid7() for _ in range(1_000)}) == 1_000


def test_system_clock_is_timezone_aware_utc() -> None:
    assert SystemClock().now().tzinfo is UTC


def test_frozen_clock_normalises_to_utc_and_advances() -> None:
    plus_five = timezone(timedelta(hours=5))
    clock = FrozenClock(datetime(2026, 10, 17, 17, 0, tzinfo=plus_five))
    assert clock.now() == datetime(2026, 10, 17, 12, 0, tzinfo=UTC)
    clock.advance(timedelta(hours=24))
    assert clock.now() == datetime(2026, 10, 18, 12, 0, tzinfo=UTC)


def test_frozen_clock_rejects_naive_datetimes() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        FrozenClock(datetime(2026, 10, 17))
