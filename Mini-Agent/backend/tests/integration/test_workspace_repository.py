"""SQLite Workspace Repository 的集成测试。"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from mini_agent.application.workspaces.ports import WorkspaceRepository
from mini_agent.domain.workspaces.errors import (
    WorkspaceAlreadyExistsError,
    WorkspacePersistenceError,
)
from mini_agent.domain.workspaces.model import Workspace
from mini_agent.infrastructure.sqlite.database import Database
from mini_agent.infrastructure.sqlite.migrations.runner import MigrationRunner
from mini_agent.infrastructure.sqlite.workspace_repository import SQLiteWorkspaceRepository


CREATED_AT = "2026-08-16T08:00:00.000Z"
RENAMED_AT = "2026-08-16T08:01:00.000Z"
OPENED_AT = "2026-08-16T08:02:00.000Z"


def make_database(tmp_path: Path) -> Database:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    database = Database(data_dir)
    MigrationRunner(database).run()
    return database


def make_workspace(
    *,
    workspace_id: str = "workspace-1",
    name: str = "Workspace",
    root_path: str = r"C:\work\workspace",
    root_path_key: str = r"c:\work\workspace",
    created_at: str = CREATED_AT,
    updated_at: str | None = None,
    last_opened_at: str | None = None,
) -> Workspace:
    return Workspace(
        id=workspace_id,
        name=name,
        root_path=root_path,
        root_path_key=root_path_key,
        created_at=created_at,
        updated_at=updated_at or created_at,
        last_opened_at=last_opened_at or created_at,
    )


def test_repository_implements_the_workspace_repository_port(tmp_path: Path) -> None:
    repository = SQLiteWorkspaceRepository(make_database(tmp_path))

    assert isinstance(repository, WorkspaceRepository)


def test_create_commits_all_workspace_fields_and_getters_return_full_entities(tmp_path: Path) -> None:
    database = make_database(tmp_path)
    workspace = make_workspace()
    repository = SQLiteWorkspaceRepository(database)

    repository.create(workspace)
    reloaded_repository = SQLiteWorkspaceRepository(database)

    assert reloaded_repository.get_by_id(workspace.id) == workspace
    assert reloaded_repository.get_by_root_path_key(workspace.root_path_key) == workspace


def test_list_all_uses_last_opened_created_then_id_as_a_stable_descending_sort(tmp_path: Path) -> None:
    repository = SQLiteWorkspaceRepository(make_database(tmp_path))
    first = make_workspace(
        workspace_id="workspace-b",
        root_path=r"C:\work\first",
        root_path_key=r"c:\work\first",
        created_at="2026-08-16T08:00:00.000Z",
        last_opened_at="2026-08-16T09:00:00.000Z",
    )
    second = make_workspace(
        workspace_id="workspace-a",
        root_path=r"C:\work\second",
        root_path_key=r"c:\work\second",
        created_at="2026-08-16T08:30:00.000Z",
        last_opened_at="2026-08-16T09:00:00.000Z",
    )
    latest = make_workspace(
        workspace_id="workspace-c",
        root_path=r"C:\work\latest",
        root_path_key=r"c:\work\latest",
        created_at="2026-08-16T08:15:00.000Z",
        last_opened_at="2026-08-16T10:00:00.000Z",
    )

    for workspace in (first, second, latest):
        repository.create(workspace)

    assert [workspace.id for workspace in repository.list_all()] == [
        latest.id,
        second.id,
        first.id,
    ]


def test_rename_and_touch_opened_only_update_their_contract_fields(tmp_path: Path) -> None:
    repository = SQLiteWorkspaceRepository(make_database(tmp_path))
    original = make_workspace()
    repository.create(original)

    assert repository.rename(original.id, "Renamed", RENAMED_AT) is True
    renamed = repository.get_by_id(original.id)
    assert renamed is not None
    assert renamed.name == "Renamed"
    assert renamed.updated_at == RENAMED_AT
    assert renamed.last_opened_at == original.last_opened_at
    assert renamed.id == original.id
    assert renamed.root_path == original.root_path
    assert renamed.root_path_key == original.root_path_key
    assert renamed.created_at == original.created_at

    assert repository.touch_opened(original.id, OPENED_AT) is True
    opened = repository.get_by_id(original.id)
    assert opened is not None
    assert opened.name == renamed.name
    assert opened.updated_at == OPENED_AT
    assert opened.last_opened_at == OPENED_AT
    assert opened.id == original.id
    assert opened.root_path == original.root_path
    assert opened.root_path_key == original.root_path_key
    assert opened.created_at == original.created_at


def test_getters_and_mutations_distinguish_a_missing_workspace(tmp_path: Path) -> None:
    repository = SQLiteWorkspaceRepository(make_database(tmp_path))

    assert repository.get_by_id("missing") is None
    assert repository.get_by_root_path_key(r"c:\missing") is None
    assert repository.rename("missing", "Name", RENAMED_AT) is False
    assert repository.touch_opened("missing", OPENED_AT) is False


def test_duplicate_root_path_key_returns_the_existing_workspace_id_without_sql_details(
    tmp_path: Path,
) -> None:
    repository = SQLiteWorkspaceRepository(make_database(tmp_path))
    existing = make_workspace()
    duplicate = make_workspace(
        workspace_id="workspace-2",
        root_path=r"C:\work\alias",
        root_path_key=existing.root_path_key,
    )
    repository.create(existing)

    with pytest.raises(WorkspaceAlreadyExistsError) as raised:
        repository.create(duplicate)

    assert raised.value.workspace_id == existing.id
    assert "sqlite" not in str(raised.value).lower()
    assert "alias" not in str(raised.value).lower()
    assert [workspace.id for workspace in repository.list_all()] == [existing.id]


def test_database_failures_are_mapped_to_safe_persistence_errors(tmp_path: Path) -> None:
    unavailable_database = Database(tmp_path / "unavailable")
    repository = SQLiteWorkspaceRepository(unavailable_database)

    with pytest.raises(WorkspacePersistenceError) as raised:
        repository.create(make_workspace())

    assert str(unavailable_database.database_path) not in str(raised.value)
    assert "sqlite" not in str(raised.value).lower()


def test_failed_insert_rolls_back_without_leaving_a_partial_workspace(tmp_path: Path) -> None:
    database = make_database(tmp_path)
    repository = SQLiteWorkspaceRepository(database)
    with database.transaction() as connection:
        connection.execute(
            """
            CREATE TRIGGER fail_workspace_insert
            BEFORE INSERT ON workspaces
            BEGIN
                SELECT RAISE(ABORT, 'private database failure');
            END
            """
        )

    with pytest.raises(WorkspacePersistenceError) as raised:
        repository.create(make_workspace())

    assert "private" not in str(raised.value).lower()
    assert repository.list_all() == []


def test_invalid_persisted_rows_are_not_silently_defaulted(tmp_path: Path) -> None:
    database = make_database(tmp_path)
    repository = SQLiteWorkspaceRepository(database)
    with database.transaction() as connection:
        connection.execute(
            """
            INSERT INTO workspaces (
                id, name, root_path, root_path_key, created_at, updated_at, last_opened_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "workspace-1",
                "Workspace",
                r"C:\work\workspace",
                r"c:\work\workspace",
                "not-a-timestamp",
                CREATED_AT,
                CREATED_AT,
            ),
        )

    with pytest.raises(WorkspacePersistenceError):
        repository.get_by_id("workspace-1")
    with pytest.raises(WorkspacePersistenceError):
        repository.list_all()


def test_missing_persisted_columns_are_mapped_to_a_safe_persistence_error(tmp_path: Path) -> None:
    data_dir = tmp_path / "malformed"
    data_dir.mkdir()
    database = Database(data_dir)
    with database.transaction() as connection:
        connection.execute(
            """
            CREATE TABLE workspaces (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL
            )
            """
        )
        connection.execute("INSERT INTO workspaces (id, name) VALUES ('workspace-1', 'Workspace')")

    repository = SQLiteWorkspaceRepository(database)

    with pytest.raises(WorkspacePersistenceError):
        repository.get_by_id("workspace-1")
