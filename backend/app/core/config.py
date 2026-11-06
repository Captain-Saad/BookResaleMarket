"""Application settings, read from environment variables (prefix BOOKLOOP_) or `.env`."""

from functools import lru_cache
from typing import Literal, Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SESSION_COOKIE = "bookloop_session"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BOOKLOOP_", env_file=".env", extra="ignore")

    env: Literal["development", "test", "production"] = "development"
    app_name: str = "BookLoop API"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_json: bool = True
    database_url: SecretStr | None = None
    database_direct_url: SecretStr | None = None
    redis_url: SecretStr | None = None
    readiness_timeout_seconds: float = 5.0
    cors_origins: list[str] = ["http://localhost:3000"]
    allowed_hosts: list[str] = ["localhost", "127.0.0.1"]
    max_request_bytes: int = 1_000_000
    bcrypt_rounds: int = 12
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    email_from: str = "BookLoop <no-reply@bookloop.test>"
    frontend_base_url: str = "http://localhost:3000"
    email_verification_hours: int = 24
    password_reset_minutes: int = 60
    session_idle_minutes: int = 60 * 24 * 7
    session_absolute_days: int = 30

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def trusted_hosts(self) -> list[str]:
        """TestClient sends `Host: testserver`, so tests allow it too."""
        return [*self.allowed_hosts, "testserver"] if self.env == "test" else self.allowed_hosts

    @property
    def session_cookie_secure(self) -> bool:
        return self.env not in {"development", "test"}

    @model_validator(mode="after")
    def _require_services_outside_tests(self) -> Self:
        required = {
            "BOOKLOOP_DATABASE_URL": self.database_url,
            "BOOKLOOP_DATABASE_DIRECT_URL": self.database_direct_url,
            "BOOKLOOP_REDIS_URL": self.redis_url,
        }
        missing = [name for name, value in required.items() if value is None]
        if self.env != "test" and missing:
            raise ValueError(f"{', '.join(missing)} must be set when BOOKLOOP_ENV={self.env}")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
