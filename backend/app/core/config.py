"""Application settings, read from environment variables (prefix BOOKLOOP_) or `.env`."""

from functools import lru_cache
from typing import Literal, Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BOOKLOOP_", env_file=".env", extra="ignore")

    env: Literal["development", "test", "production"] = "development"
    app_name: str = "BookLoop API"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_json: bool = True
    database_url: SecretStr | None = None
    database_direct_url: SecretStr | None = None
    readiness_timeout_seconds: float = 5.0

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @model_validator(mode="after")
    def _require_database_outside_tests(self) -> Self:
        if self.env != "test" and (self.database_url is None or self.database_direct_url is None):
            raise ValueError(
                "BOOKLOOP_DATABASE_URL and BOOKLOOP_DATABASE_DIRECT_URL must be set "
                f"when BOOKLOOP_ENV={self.env}"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
