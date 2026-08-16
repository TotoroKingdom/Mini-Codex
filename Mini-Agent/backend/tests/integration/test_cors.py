"""Integration tests for the explicit Health CORS allowlist."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from mini_agent.api.app import create_app
from mini_agent.config import Settings


ALLOWED_ORIGIN = "http://localhost:5173"
DENIED_ORIGIN = "http://localhost:4173"


def make_client(tmp_path: Path) -> TestClient:
    settings = Settings(
        environment="test",
        data_dir=tmp_path / "data-not-created",
        cors_origins=(ALLOWED_ORIGIN,),
        _env_file=None,
    )
    return TestClient(create_app(settings))


def test_allowed_origin_can_read_health_and_preflight_get(tmp_path: Path) -> None:
    with make_client(tmp_path) as client:
        response = client.get("/api/health", headers={"Origin": ALLOWED_ORIGIN})
        preflight = client.options(
            "/api/health",
            headers={
                "Origin": ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "access-control-allow-credentials" not in response.headers
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "GET" in preflight.headers["access-control-allow-methods"]
    assert "access-control-allow-credentials" not in preflight.headers


def test_denied_origin_receives_no_cross_origin_read_permission(tmp_path: Path) -> None:
    with make_client(tmp_path) as client:
        response = client.get("/api/health", headers={"Origin": DENIED_ORIGIN})
        preflight = client.options(
            "/api/health",
            headers={
                "Origin": DENIED_ORIGIN,
                "Access-Control-Request-Method": "GET",
            },
        )

    assert "access-control-allow-origin" not in response.headers
    assert preflight.status_code == 400
    assert "access-control-allow-origin" not in preflight.headers


def test_preflight_does_not_allow_methods_other_than_get(tmp_path: Path) -> None:
    with make_client(tmp_path) as client:
        preflight = client.options(
            "/api/health",
            headers={
                "Origin": ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
            },
        )

    assert preflight.status_code == 400
    assert "POST" not in preflight.headers["access-control-allow-methods"]
