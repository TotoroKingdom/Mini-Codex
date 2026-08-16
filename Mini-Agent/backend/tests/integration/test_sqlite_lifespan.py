"""Integration tests for SQLite migration wiring in the application lifespan."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import mini_agent.api.app as app_module
from mini_agent.api.app import DataDirectoryError, create_app
from mini_agent.config import Settings
from mini_agent.infrastructure.sqlite.database import Database


def make_settings(data_dir: Path) -> Settings:
    return Settings(
        environment="test",
        data_dir=data_dir,
        cors_origins=("http://localhost:5173",),
        _env_file=None,
    )


def read_history(database_path: Path) -> list[tuple[int, str, str, str]]:
    database = Database(database_path.parent)
    with database.read_connection() as connection:
        rows = connection.execute(
            "SELECT version, name, checksum, applied_at FROM schema_versions ORDER BY version"
        ).fetchall()
    return [tuple(row) for row in rows]


def test_lifespan_creates_the_data_directory_runs_migrations_and_publishes_database(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "nested" / "data"
    app = create_app(make_settings(data_dir))

    assert not data_dir.exists()
    assert not hasattr(app.state, "database")

    with TestClient(app):
        assert data_dir.is_dir()
        assert isinstance(app.state.database, Database)
        assert app.state.database_probe is app.state.database
        assert hasattr(app.state, "workspace_service")
        assert app.state.database.database_path.exists()
        assert app.state.database.probe() == 2

    assert [row[0:2] for row in read_history(data_dir / "mini-agent.db")] == [
        (1, "001_schema_versions"),
        (2, "002_workspaces"),
    ]


def test_lifespan_restarts_without_reapplying_migrations(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    app = create_app(make_settings(data_dir))

    with TestClient(app):
        pass
    first_history = read_history(data_dir / "mini-agent.db")

    with TestClient(app):
        pass
    second_history = read_history(data_dir / "mini-agent.db")

    assert second_history == first_history
    assert len(second_history) == 2


def test_lifespan_orders_database_migration_probe_and_dependency_publication(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data_dir = tmp_path / "data"
    events: list[str] = []

    class RecordingDatabase:
        def __init__(self, configured_data_dir: Path) -> None:
            assert configured_data_dir == data_dir
            assert data_dir.is_dir()
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

    monkeypatch.setattr(app_module, "Database", RecordingDatabase)
    monkeypatch.setattr(app_module, "MigrationRunner", RecordingRunner)
    app = create_app(make_settings(data_dir))

    with TestClient(app):
        assert events == ["database", "runner", "migrate", "probe"]
        assert isinstance(app.state.database, RecordingDatabase)
        assert app.state.database_probe is app.state.database
        assert hasattr(app.state, "workspace_service")


def test_unavailable_data_directory_fails_before_database_startup(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_to_create_directory(_data_dir: Path) -> None:
        raise DataDirectoryError("The application data directory is unavailable.")

    monkeypatch.setattr(app_module, "_create_data_directory", fail_to_create_directory)
    app = create_app(make_settings(tmp_path / "unavailable"))

    with pytest.raises(DataDirectoryError, match="data directory is unavailable"):
        with TestClient(app):
            pass

    assert not hasattr(app.state, "database")


def test_migration_failure_rejects_startup_without_publishing_a_database(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    expected_error = RuntimeError("controlled migration failure")

    class FailingRunner:
        def __init__(self, _database: Database) -> None:
            pass

        def run(self) -> None:
            raise expected_error

    monkeypatch.setattr(app_module, "MigrationRunner", FailingRunner)
    app = create_app(make_settings(tmp_path / "data"))

    with pytest.raises(RuntimeError) as raised:
        with TestClient(app):
            pass

    assert raised.value is expected_error
    assert not hasattr(app.state, "database")
    assert not hasattr(app.state, "workspace_service")
