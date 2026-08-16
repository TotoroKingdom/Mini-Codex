"""Workspace Service 与真实 SQLite Repository 的集成测试。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from mini_agent.application.workspaces.service import WorkspaceService
from mini_agent.infrastructure.sqlite.database import Database
from mini_agent.infrastructure.sqlite.migrations.runner import MigrationRunner
from mini_agent.infrastructure.sqlite.workspace_repository import SQLiteWorkspaceRepository
from mini_agent.infrastructure.workspaces.windows_path_resolver import WindowsWorkspacePathResolver


@dataclass
class FixedIdGenerator:
    workspace_id: str

    def new_id(self) -> str:
        return self.workspace_id


@dataclass
class MutableClock:
    timestamp: datetime

    def now(self) -> datetime:
        return self.timestamp


def make_service(
    tmp_path: Path,
    workspace_id: str = "workspace-1",
) -> tuple[WorkspaceService, MutableClock]:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    database = Database(data_dir)
    MigrationRunner(database).run()
    clock = MutableClock(datetime(2026, 8, 16, 8, 0, tzinfo=timezone.utc))
    service = WorkspaceService(
        SQLiteWorkspaceRepository(database),
        WindowsWorkspacePathResolver(),
        FixedIdGenerator(workspace_id),
        clock,
    )
    return service, clock


def test_real_sqlite_service_completes_create_list_rename_and_open_without_http(
    tmp_path: Path,
) -> None:
    workspace_root = tmp_path / "workspace-root"
    workspace_root.mkdir()
    service, clock = make_service(tmp_path)

    created = service.create(str(workspace_root))
    listed = service.list_all()
    clock.timestamp = datetime(2026, 8, 16, 8, 1, tzinfo=timezone.utc)
    renamed = service.rename(created.workspace.id, "  Renamed Root  ")
    clock.timestamp = datetime(2026, 8, 16, 8, 2, tzinfo=timezone.utc)
    opened = service.open(created.workspace.id)

    assert created.workspace.name == "workspace-root"
    assert created.availability.value == "available"
    assert [item.workspace for item in listed] == [created.workspace]
    assert renamed.workspace.name == "Renamed Root"
    assert renamed.workspace.root_path == created.workspace.root_path
    assert renamed.workspace.root_path_key == created.workspace.root_path_key
    assert opened.workspace.updated_at == "2026-08-16T08:02:00.000Z"
    assert opened.workspace.last_opened_at == "2026-08-16T08:02:00.000Z"
    assert opened.workspace.root_path == created.workspace.root_path
    assert opened.availability.value == "available"
