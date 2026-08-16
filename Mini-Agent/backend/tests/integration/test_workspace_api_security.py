"""Workspace API 的响应、异常与日志隐私边界测试。"""

from __future__ import annotations

import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from mini_agent.api.app import create_app
from mini_agent.config import Settings
from mini_agent.domain.workspaces.errors import WorkspacePersistenceError


def make_settings(data_dir: Path) -> Settings:
    return Settings(
        environment="test",
        data_dir=data_dir,
        cors_origins=("http://localhost:5173",),
        _env_file=None,
    )


def test_missing_path_error_and_logs_do_not_leak_input_or_database_details(
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    data_dir = tmp_path / "private-data"
    sensitive_root = tmp_path / "private-root" / "missing"
    app = create_app(make_settings(data_dir))

    with TestClient(app) as client, caplog.at_level(
        logging.INFO,
        logger="mini_agent.api.routes.workspaces",
    ):
        response = client.post("/api/workspaces", json={"root_path": str(sensitive_root)})
        health = client.get("/api/health")
        missing_route = client.get("/api/not-found")

    for payload in (response.text, health.text, missing_route.text, caplog.text):
        assert str(sensitive_root) not in payload
        assert str(data_dir) not in payload
        assert "root_path_key" not in payload
        assert "SELECT" not in payload
        assert "Traceback" not in payload
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "workspace_path_missing"
    assert health.status_code == 200
    assert missing_route.status_code == 404


def test_persistence_failure_does_not_leak_sql_or_leave_a_partial_record(
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    root = tmp_path / "workspace-root"
    root.mkdir()
    data_dir = tmp_path / "database-secret"
    app = create_app(make_settings(data_dir))

    class FailingRepository:
        """模拟 Repository 的非预期失败，不暴露底层异常内容。"""

        def get_by_root_path_key(self, _root_path_key: str) -> None:
            return None

        def create(self, _workspace: object) -> None:
            raise WorkspacePersistenceError()

    with TestClient(app) as client, caplog.at_level(
        logging.INFO,
        logger="mini_agent.api.routes.workspaces",
    ):
        app.state.workspace_service._repository = FailingRepository()
        response = client.post("/api/workspaces", json={"root_path": str(root)})
        with app.state.database.read_connection() as connection:
            count = connection.execute("SELECT COUNT(*) FROM workspaces").fetchone()[0]

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "workspace_persistence_failed",
            "message": "The workspace could not be saved.",
        }
    }
    assert count == 0
    for payload in (response.text, caplog.text):
        assert str(root) not in payload
        assert str(data_dir) not in payload
        assert "root_path_key" not in payload
        assert "SELECT" not in payload
        assert "Traceback" not in payload


def test_raw_os_error_is_mapped_without_exposing_its_message_or_path(
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    root = tmp_path / "workspace-root"
    root.mkdir()
    sensitive_message = f"SELECT * FROM workspaces at {tmp_path / 'private.db'} Traceback"
    app = create_app(make_settings(tmp_path / "data"))

    class FailingPathOperations:
        """模拟带敏感文本的原始 OS 异常。"""

        def resolve_existing(self, _path: str) -> str:
            raise OSError(sensitive_message)

        def is_directory(self, _path: str) -> bool:
            raise AssertionError("resolve_existing should fail first")

        def check_basic_listing(self, _path: str) -> None:
            raise AssertionError("resolve_existing should fail first")

    with TestClient(app) as client, caplog.at_level(
        logging.INFO,
        logger="mini_agent.api.routes.workspaces",
    ):
        app.state.workspace_service._path_resolver._operations = FailingPathOperations()
        response = client.post("/api/workspaces", json={"root_path": str(root)})

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "workspace_path_invalid",
            "message": "The workspace path is invalid.",
            "field": "root_path",
        }
    }
    for payload in (response.text, caplog.text):
        assert sensitive_message not in payload
        assert str(root) not in payload
        assert "root_path_key" not in payload


def test_workspace_response_only_exposes_root_path_on_workspace_endpoint(tmp_path: Path) -> None:
    root = tmp_path / "workspace-root"
    root.mkdir()
    app = create_app(make_settings(tmp_path / "data"))

    with TestClient(app) as client:
        created = client.post("/api/workspaces", json={"root_path": str(root)})
        listed = client.get("/api/workspaces")
        health = client.get("/api/health")
        unknown = client.get("/api/not-found")

    assert created.status_code == 201
    assert created.json()["root_path"] == str(root)
    assert listed.json()["items"][0]["root_path"] == str(root)
    assert "root_path_key" not in created.text
    assert "root_path_key" not in listed.text
    assert str(root) not in health.text
    assert str(root) not in unknown.text
