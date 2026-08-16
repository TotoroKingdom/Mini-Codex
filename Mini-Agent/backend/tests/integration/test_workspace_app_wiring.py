"""Workspace Route、Lifespan 依赖装配与替换边界测试。"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import mini_agent.api.app as app_module
from mini_agent.api.app import create_app
from mini_agent.api.routes.workspaces import get_workspace_service
from mini_agent.application.workspaces.service import (
    UtcClock,
    UuidWorkspaceIdGenerator,
    WorkspaceService,
)
from mini_agent.config import Settings
from mini_agent.infrastructure.sqlite.workspace_repository import SQLiteWorkspaceRepository
from mini_agent.infrastructure.workspaces.windows_path_resolver import WindowsWorkspacePathResolver


def make_settings(data_dir: Path) -> Settings:
    return Settings(
        environment="test",
        data_dir=data_dir,
        cors_origins=("http://localhost:5173",),
        _env_file=None,
    )


def test_app_registers_exactly_the_four_workspace_routes() -> None:
    app = create_app(make_settings(Path("C:/unused-workspace-wiring-data")))

    route_methods = {
        (path, method.upper())
        for path, operations in app.openapi()["paths"].items()
        if path.startswith("/api/workspaces")
        for method in operations
    }

    assert route_methods == {
        ("/api/workspaces", "GET"),
        ("/api/workspaces", "POST"),
        ("/api/workspaces/{workspace_id}", "PATCH"),
        ("/api/workspaces/{workspace_id}/open", "POST"),
    }


def test_lifespan_publishes_one_fully_wired_workspace_service(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path / "data"))

    with TestClient(app):
        service = app.state.workspace_service

        assert isinstance(service, WorkspaceService)
        assert isinstance(service._repository, SQLiteWorkspaceRepository)
        assert isinstance(service._path_resolver, WindowsWorkspacePathResolver)
        assert isinstance(service._id_generator, UuidWorkspaceIdGenerator)
        assert isinstance(service._clock, UtcClock)
        assert service._repository._database is app.state.database
        assert not hasattr(app.state, "workspace_repository")
        assert not hasattr(app.state, "workspace_path_resolver")


def test_app_factory_route_can_override_workspace_service_without_workspace_access(
    tmp_path: Path,
) -> None:
    class FakeWorkspaceService:
        def list_all(self) -> list[object]:
            return []

    app = create_app(make_settings(tmp_path / "isolated-data"))
    app.dependency_overrides[get_workspace_service] = FakeWorkspaceService

    with TestClient(app) as client:
        response = client.get("/api/workspaces")

    assert response.status_code == 200
    assert response.json() == {"items": []}
    assert (tmp_path / "isolated-data").is_dir()


def test_lifespan_does_not_publish_partially_assembled_dependencies(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FailingWorkspaceService:
        def __init__(self, **_dependencies: object) -> None:
            raise RuntimeError("controlled workspace service failure")

    monkeypatch.setattr(app_module, "WorkspaceService", FailingWorkspaceService)
    app = create_app(make_settings(tmp_path / "data"))

    with pytest.raises(RuntimeError, match="controlled workspace service failure"):
        with TestClient(app):
            pass

    assert not hasattr(app.state, "workspace_service")
    assert not hasattr(app.state, "database")
    assert not hasattr(app.state, "database_probe")


def test_lifespan_constructs_dependencies_after_database_ready_in_order(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    events: list[str] = []

    class RecordingDatabase:
        def __init__(self, _data_dir: Path) -> None:
            events.append("database")

        def probe(self) -> int:
            events.append("probe")
            return 2

    class RecordingRunner:
        def __init__(self, database: RecordingDatabase) -> None:
            assert isinstance(database, RecordingDatabase)
            events.append("runner")

        def run(self) -> None:
            events.append("migrate")

    class RecordingRepository:
        def __init__(self, database: RecordingDatabase) -> None:
            assert events == ["database", "runner", "migrate", "probe"]
            assert isinstance(database, RecordingDatabase)
            events.append("repository")

    class RecordingResolver:
        def __init__(self) -> None:
            assert events == ["database", "runner", "migrate", "probe", "repository"]
            events.append("resolver")

    class RecordingIdGenerator:
        def __init__(self) -> None:
            assert events == ["database", "runner", "migrate", "probe", "repository", "resolver"]
            events.append("id_generator")

    class RecordingClock:
        def __init__(self) -> None:
            assert events == [
                "database",
                "runner",
                "migrate",
                "probe",
                "repository",
                "resolver",
                "id_generator",
            ]
            events.append("clock")

    class RecordingService:
        def __init__(self, **dependencies: object) -> None:
            assert events == [
                "database",
                "runner",
                "migrate",
                "probe",
                "repository",
                "resolver",
                "id_generator",
                "clock",
            ]
            assert set(dependencies) == {"repository", "path_resolver", "id_generator", "clock"}
            events.append("service")

    monkeypatch.setattr(app_module, "Database", RecordingDatabase)
    monkeypatch.setattr(app_module, "MigrationRunner", RecordingRunner)
    monkeypatch.setattr(app_module, "SQLiteWorkspaceRepository", RecordingRepository)
    monkeypatch.setattr(app_module, "WindowsWorkspacePathResolver", RecordingResolver)
    monkeypatch.setattr(app_module, "UuidWorkspaceIdGenerator", RecordingIdGenerator)
    monkeypatch.setattr(app_module, "UtcClock", RecordingClock)
    monkeypatch.setattr(app_module, "WorkspaceService", RecordingService)
    app = create_app(make_settings(tmp_path / "data"))

    with TestClient(app):
        assert events == [
            "database",
            "runner",
            "migrate",
            "probe",
            "repository",
            "resolver",
            "id_generator",
            "clock",
            "service",
        ]
        assert isinstance(app.state.workspace_service, RecordingService)
