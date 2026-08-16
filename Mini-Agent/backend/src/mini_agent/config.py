"""Centralized backend configuration."""

from __future__ import annotations

from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)

Environment = Literal["development", "test", "production"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


class Settings(BaseSettings):
    """Validated settings for the backend process.

    Constructing this class only resolves and validates values. Runtime resources
    such as the data directory and database belong to the application lifespan.
    """

    model_config = SettingsConfigDict(
        env_prefix="MINI_AGENT_",
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        enable_decoding=False,
        extra="ignore",
        populate_by_name=True,
        validate_default=True,
    )

    environment: Environment = Field(
        default="development",
        validation_alias="MINI_AGENT_ENV",
    )
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    data_dir: Path = Path(".data")
    cors_origins: tuple[str, ...] = DEFAULT_CORS_ORIGINS
    log_level: LogLevel = "INFO"

    @field_validator("data_dir", mode="before")
    @classmethod
    def resolve_data_dir(cls, value: str | Path) -> Path:
        """Resolve relative data directories against the backend project root."""
        path = Path(value).expanduser()
        if not path.is_absolute():
            path = PROJECT_ROOT / path
        return path.resolve(strict=False)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: str | tuple[str, ...] | list[str]) -> tuple[str, ...]:
        """Accept comma-separated origins and normalize them to HTTP(S) origins."""
        if isinstance(value, str):
            origins = value.split(",")
        elif isinstance(value, (list, tuple)):
            origins = list(value)
        else:
            raise ValueError("CORS origins must be a comma-separated string or a list of origins.")

        normalized_origins = tuple(cls._normalize_origin(origin) for origin in origins)
        if not normalized_origins:
            raise ValueError("At least one CORS origin must be configured.")
        return normalized_origins

    @classmethod
    def _normalize_origin(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("Each CORS origin must be a string.")

        origin = value.strip()
        if not origin or "*" in origin:
            raise ValueError("CORS origins must be explicit HTTP(S) origins without wildcards.")

        try:
            parsed = urlsplit(origin)
            port = parsed.port
        except ValueError as error:
            raise ValueError("CORS origins must include a valid host and port.") from error

        if (
            parsed.scheme.lower() not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("CORS origins must be explicit HTTP(S) origins without paths or queries.")

        scheme = parsed.scheme.lower()
        host = parsed.hostname.lower()
        if ":" in host:
            host = f"[{host}]"
        if (scheme == "http" and port == 80) or (scheme == "https" and port == 443):
            port = None

        return f"{scheme}://{host}" if port is None else f"{scheme}://{host}:{port}"

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("Log level must be a string.")
        return value.upper()
