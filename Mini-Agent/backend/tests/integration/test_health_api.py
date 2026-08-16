"""Integration tests for Health HTTP behavior through the app factory."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from mini_agent.api.app import create_app
from mini_agent.config import Settings


class ReadyProbe:
    def probe(self) -> int:
        return 7


def make_app(tmp_path: Path):
    settings = Settings(
        environment="test",
        data_dir=tmp_path / "data-not-created",
        cors_origins=("http://localhost:5173",),
        _env_file=None,
    )
    return create_app(settings)


def test_health_returns_ready_contract_when_lifespan_receives_a_probe(tmp_path: Path) -> None:
    app = make_app(tmp_path)
    app.state.database_probe = ReadyProbe()

    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {
        "status": "ok",
        "service": "mini-agent-backend",
        "api_version": "v1",
        "database": {"status": "ready", "schema_version": 7},
    }


def test_health_defaults_to_stable_degraded_contract_and_unknown_api_is_standard_404(
    tmp_path: Path,
) -> None:
    app = make_app(tmp_path)

    with TestClient(app) as client:
        health_response = client.get("/api/health")
        missing_response = client.get("/api/not-found")

    assert health_response.status_code == 503
    assert health_response.headers["content-type"].startswith("application/json")
    assert health_response.headers["cache-control"] == "no-store"
    assert health_response.json() == {
        "status": "degraded",
        "service": "mini-agent-backend",
        "api_version": "v1",
        "database": {"status": "unavailable", "schema_version": None},
    }
    assert set(health_response.json()) == {"status", "service", "api_version", "database"}
    assert missing_response.status_code == 404
    assert missing_response.json() == {"detail": "Not Found"}
