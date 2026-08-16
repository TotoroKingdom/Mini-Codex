"""M03 P01 Domain、Path、Persistence 与 Application Service 的累计回归测试。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from mini_agent.api.app import create_app
from mini_agent.application.workspaces.service import WorkspaceService
from mini_agent.config import Settings
from mini_agent.domain.workspaces.errors import (
    WorkspaceAlreadyExistsError,
    WorkspacePathMissingError,
)
from mini_agent.domain.workspaces.model import Workspace, WorkspaceAvailability
from mini_agent.infrastructure.sqlite.database import Database
from mini_agent.infrastructure.sqlite.migrations.runner import MigrationRunner
from mini_agent.infrastructure.sqlite.migrations.versions.v001_schema_versions import (
    MIGRATION as V001_SCHEMA_VERSIONS,
)
from mini_agent.infrastructure.sqlite.workspace_repository import SQLiteWorkspaceRepository
from mini_agent.infrastructure.workspaces.windows_path_resolver import WindowsWorkspacePathResolver


@dataclass
class SequentialIdGenerator:
    """为真实组件集成测试提供确定性的 Workspace ID。"""

    values: list[str]

    def new_id(self) -> str:
        return self.values.pop(0)


@dataclass
class MutableClock:
    """为真实组件集成测试提供确定性的 UTC 时间。"""

    timestamp: datetime

    def now(self) -> datetime:
        return self.timestamp


def make_settings(data_dir: Path) -> Settings:
    return Settings(
        environment="test",
        data_dir=data_dir,
        cors_origins=("http://localhost:5173",),
        _env_file=None,
    )


def test_real_p01_stack_preserves_workspace_identity_and_isolates_path_failures(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    database = Database(data_dir)
    MigrationRunner(database).run()
    repository = SQLiteWorkspaceRepository(database)
    clock = MutableClock(datetime(2026, 8, 16, 8, 0, tzinfo=timezone.utc))
    service = WorkspaceService(
        repository,
        WindowsWorkspacePathResolver(),
        SequentialIdGenerator(["available", "missing", "duplicate"]),
        clock,
    )
    available_root = tmp_path / "available-root"
    missing_root = tmp_path / "missing-root"
    file_root = tmp_path / "not-a-directory.txt"
    available_root.mkdir()
    missing_root.mkdir()
    file_root.write_text("not a workspace directory", encoding="utf-8")

    available = service.create(str(available_root))
    missing = service.create(str(missing_root))
    missing_root.rmdir()
    repository.create(
        Workspace.create(
            workspace_id="file",
            name="File Root",
            root_path=str(file_root.resolve()),
            root_path_key=str(file_root.resolve()).replace("/", "\\").casefold(),
            created_at="2026-08-16T08:00:00.000Z",
        )
    )

    with pytest.raises(WorkspaceAlreadyExistsError) as duplicate:
        service.create(str(available_root / "."))
    assert duplicate.value.workspace_id == available.workspace.id

    projected = {item.workspace.id: item for item in service.list_all()}
    assert projected["available"].availability is WorkspaceAvailability.AVAILABLE
    assert projected["missing"].availability is WorkspaceAvailability.MISSING
    assert projected["file"].availability is WorkspaceAvailability.NOT_DIRECTORY

    clock.timestamp = datetime(2026, 8, 16, 8, 1, tzinfo=timezone.utc)
    renamed_missing = service.rename(missing.workspace.id, "Renamed Missing")
    before_failed_open = renamed_missing.workspace
    assert renamed_missing.availability is WorkspaceAvailability.MISSING
    assert renamed_missing.workspace.root_path == missing.workspace.root_path
    assert renamed_missing.workspace.root_path_key == missing.workspace.root_path_key

    with pytest.raises(WorkspacePathMissingError):
        service.open(missing.workspace.id)
    assert repository.get_by_id(missing.workspace.id) == before_failed_open


def test_version_one_database_upgrades_through_lifespan_and_restarts_idempotently(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "version-one-data"
    data_dir.mkdir()
    database = Database(data_dir)
    MigrationRunner(database, (V001_SCHEMA_VERSIONS,)).run()
    version_one_history = []
    with database.read_connection() as connection:
        version_one_history = connection.execute(
            "SELECT version, name, checksum, applied_at FROM schema_versions ORDER BY version"
        ).fetchall()

    app = create_app(make_settings(data_dir))
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {
            "status": "ok",
            "service": "mini-agent-backend",
            "api_version": "v1",
            "database": {"status": "ready", "schema_version": 2},
        }

    with database.read_connection() as connection:
        first_history = connection.execute(
            "SELECT version, name, checksum, applied_at FROM schema_versions ORDER BY version"
        ).fetchall()
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()

    with TestClient(create_app(make_settings(data_dir))) as client:
        assert client.get("/api/health").status_code == 200

    with database.read_connection() as connection:
        second_history = connection.execute(
            "SELECT version, name, checksum, applied_at FROM schema_versions ORDER BY version"
        ).fetchall()

    assert first_history[0] == version_one_history[0]
    assert [row[0:2] for row in first_history] == [
        (1, "001_schema_versions"),
        (2, "002_workspaces"),
    ]
    assert second_history == first_history
    assert [row["name"] for row in tables] == ["schema_versions", "workspaces"]
