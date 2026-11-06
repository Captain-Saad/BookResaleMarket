"""Password hashing and random tokens. Only hashes are ever stored (backend.md §5)."""

import hashlib
import secrets
from functools import lru_cache

import bcrypt

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72


def hash_password(password: str, rounds: int) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=rounds)).decode()


def verify_password(password: str, password_hash: str) -> bool:
    encoded = password.encode()
    if len(encoded) > PASSWORD_MAX_BYTES:
        return False
    return bcrypt.checkpw(encoded, password_hash.encode())


@lru_cache
def dummy_password_hash(rounds: int) -> str:
    """Checked when an email has no account, so that login takes the same time either way."""
    return hash_password(secrets.token_urlsafe(32), rounds)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
