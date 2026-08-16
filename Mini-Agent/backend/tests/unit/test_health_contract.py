"""Unit tests for the stable health HTTP contract."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from pydantic import ValidationError

from mini_agent.api.routes.health import get_database_probe, router
from mini_agent.api.schemas.health import DatabaseHealth, HealthResponse


class ReadyProbe:
    def __init__(self, schema_version: int = 1) -> None:
        self.schema_version = schema_version

    def probe(self) -> int:
        return self.schema_version


class FailingProbe:
    def probe(self) -> int:
        raise RuntimeError(r"C:\private\mini-agent.db secret probe failure")


def make_client(probe: object | None = None) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    if probe is not None:
        app.dependency_overrides[get_database_probe] = lambda: probe
    return TestClient(app)


def test_ready_probe_returns_the_final_200_contract() -> None:
    response = make_client(ReadyProbe(schema_version=7)).get("/api/health")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {
        "status": "ok",
        "service": "mini-agent-backend",
        "api_version": "v1",
        "database": {"status": "ready", "schema_version": 7},
    }


def test_default_p01_probe_does_not_claim_database_readiness() -> None:
    response = make_client().get("/api/health")

    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {
        "status": "degraded",
        "service": "mini-agent-backend",
        "api_version": "v1",
        "database": {"status": "unavailable", "schema_version": None},
    }


def test_probe_failure_returns_a_stable_503_without_sensitive_details() -> None:
    response = make_client(FailingProbe()).get("/api/health")

    assert response.status_code == 503
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["status"] == "degraded"
    assert response.json()["database"] == {"status": "unavailable", "schema_version": None}
    assert "private" not in response.text
    assert "secret" not in response.text
    assert "mini-agent.db" not in response.text


@pytest.mark.parametrize(
    "database",
    [
        DatabaseHealth(status="ready", schema_version=1),
        DatabaseHealth(status="unavailable", schema_version=None),
    ],
)
def test_health_response_accepts_only_valid_status_combinations(database: DatabaseHealth) -> None:
    expected_status = "ok" if database.status == "ready" else "degraded"

    response = HealthResponse(status=expected_status, database=database)

    assert response.status == expected_status
    assert response.service == "mini-agent-backend"
    assert response.api_version == "v1"


@pytest.mark.parametrize(
    "payload",
    [
        {"status": "unknown", "database": {"status": "ready", "schema_version": 1}},
        {"status": "ok", "database": {"status": "unavailable", "schema_version": None}},
        {"status": "degraded", "database": {"status": "ready", "schema_version": 1}},
        {"status": "ok", "database": {"status": "ready", "schema_version": None}},
        {"status": "degraded", "database": {"status": "unavailable", "schema_version": 1}},
        {
            "status": "ok",
            "database": {"status": "ready", "schema_version": 1},
            "database_path": r"C:\private\mini-agent.db",
        },
    ],
)
def test_health_response_rejects_invalid_enums_combinations_and_extra_fields(
    payload: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        HealthResponse.model_validate(payload)
