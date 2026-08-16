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


def test_allowed_origin_preflight_allows_workspace_command_methods_and_json_header(
    tmp_path: Path,
) -> None:
    with make_client(tmp_path) as client:
        for method in ("GET", "POST", "PATCH"):
            preflight = client.options(
                "/api/workspaces",
                headers={
                    "Origin": ALLOWED_ORIGIN,
                    "Access-Control-Request-Method": method,
                    "Access-Control-Request-Headers": "Content-Type",
                },
            )

            assert preflight.status_code == 200
            assert preflight.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
            assert method in preflight.headers["access-control-allow-methods"]
            assert "content-type" in preflight.headers["access-control-allow-headers"].lower()
            assert "access-control-allow-credentials" not in preflight.headers


def test_preflight_rejects_unapproved_method_or_header(tmp_path: Path) -> None:
    with make_client(tmp_path) as client:
        method_preflight = client.options(
            "/api/workspaces",
            headers={
                "Origin": ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "DELETE",
            },
        )
        header_preflight = client.options(
            "/api/workspaces",
            headers={
                "Origin": ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "X-Workspace-Token",
            },
        )

    assert method_preflight.status_code == 400
    assert "DELETE" not in method_preflight.headers["access-control-allow-methods"]
    assert header_preflight.status_code == 400
    assert "x-workspace-token" not in header_preflight.headers["access-control-allow-headers"].lower()
