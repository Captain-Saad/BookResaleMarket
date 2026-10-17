"""UUIDv7 (RFC 9562): a 48-bit millisecond timestamp followed by random bits, so IDs sort by
creation time, which keeps B-tree primary-key indexes compact. Python 3.14 adds uuid.uuid7;
we support 3.12+, so it is implemented here."""

import secrets
import time
from uuid import UUID

_TIMESTAMP_MASK = (1 << 48) - 1
_RAND_B_BITS = 62


def uuid7(unix_ms: int | None = None) -> UUID:
    timestamp = (time.time_ns() // 1_000_000 if unix_ms is None else unix_ms) & _TIMESTAMP_MASK
    rand_a = secrets.randbits(12)
    rand_b = secrets.randbits(_RAND_B_BITS)
    value = (timestamp << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << _RAND_B_BITS) | rand_b
    return UUID(int=value)


def uuid7_unix_ms(value: UUID) -> int:
    return value.int >> 80
