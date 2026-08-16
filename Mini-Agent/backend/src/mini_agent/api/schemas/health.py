"""Stable response models for the backend health endpoint."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DatabaseHealth(BaseModel):
    """The database portion of the public health contract."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["ready", "unavailable"]
    schema_version: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_schema_version_for_status(self) -> DatabaseHealth:
        if self.status == "ready" and self.schema_version is None:
            raise ValueError("A ready database must report a schema version.")
        if self.status == "unavailable" and self.schema_version is not None:
            raise ValueError("An unavailable database cannot report a schema version.")
        return self


class HealthResponse(BaseModel):
    """Public response body for both healthy and degraded service states."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["ok", "degraded"]
    service: Literal["mini-agent-backend"] = "mini-agent-backend"
    api_version: Literal["v1"] = "v1"
    database: DatabaseHealth

    @model_validator(mode="after")
    def validate_service_status_for_database(self) -> HealthResponse:
        if self.status == "ok" and self.database.status != "ready":
            raise ValueError("An ok service must have a ready database.")
        if self.status == "degraded" and self.database.status != "unavailable":
            raise ValueError("A degraded service must have an unavailable database.")
        return self

    @classmethod
    def ready(cls, schema_version: int) -> HealthResponse:
        return cls(
            status="ok",
            database=DatabaseHealth(status="ready", schema_version=schema_version),
        )

    @classmethod
    def degraded(cls) -> HealthResponse:
        return cls(
            status="degraded",
            database=DatabaseHealth(status="unavailable", schema_version=None),
        )
