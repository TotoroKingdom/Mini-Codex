"""Integration tests for the minimal ordered SQLite migration runner."""

from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

from mini_agent.infrastructure.sqlite.database import Database
from mini_agent.infrastructure.sqlite.migrations.model import Migration
from mini_agent.infrastructure.sqlite.migrations.registry import MIGRATIONS
from mini_agent.infrastructure.sqlite.migrations.runner import MigrationHistoryError, MigrationRunner
from mini_agent.infrastructure.sqlite.migrations.versions.v001_schema_versions import (
    MIGRATION as V001_SCHEMA_VERSIONS,
)
from mini_agent.infrastructure.sqlite.migrations.versions.v002_workspaces import (
    MIGRATION as V002_WORKSPACES,
)


BACKEND_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = BACKEND_ROOT / "src"
FIXED_TIME = datetime(2026, 8, 16, 1, 2, 3, tzinfo=timezone.utc)


def fixed_clock() -> datetime:
    return FIXED_TIME


def make_database(tmp_path: Path) -> Database:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    return Database(data_dir)


def make_migration(version: int, name: str, upgrade: object) -> Migration:
    return Migration(
        version=version,
        name=name,
        checksum_source=f"-- migration {version}: {name}",
        upgrade=upgrade,  # type: ignore[arg-type]
    )


def read_history(database: Database) -> list[tuple[int, str, str, str]]:
    with database.read_connection() as connection:
        rows = connection.execute(
            "SELECT version, name, checksum, applied_at FROM schema_versions ORDER BY version"
        ).fetchall()
    return [tuple(row) for row in rows]


def test_runner_bootstraps_and_records_the_production_migrations(tmp_path: Path) -> None:
    database = make_database(tmp_path)

    MigrationRunner(database, clock=fixed_clock).run()

    history = read_history(database)
    assert history == [
        (1, "001_schema_versions", MIGRATIONS[0].checksum, "2026-08-16T01:02:03+00:00"),
        (2, "002_workspaces", MIGRATIONS[1].checksum, "2026-08-16T01:02:03+00:00"),
    ]
    with database.read_connection() as connection:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()

    assert [row["name"] for row in tables] == ["schema_versions", "workspaces"]


def test_runner_is_idempotent_and_does_not_rewrite_applied_history(tmp_path: Path) -> None:
    database = make_database(tmp_path)
    MigrationRunner(database, clock=fixed_clock).run()
    before = read_history(database)

    later_time = datetime(2027, 1, 1, tzinfo=timezone.utc)
    MigrationRunner(database, clock=lambda: later_time).run()

    assert read_history(database) == before


def test_runner_upgrades_an_existing_version_one_database_without_rewriting_history(
    tmp_path: Path,
) -> None:
    database = make_database(tmp_path)
    MigrationRunner(database, (V001_SCHEMA_VERSIONS,), clock=fixed_clock).run()
    version_one_history = read_history(database)

    MigrationRunner(database, clock=fixed_clock).run()

    assert read_history(database)[0] == version_one_history[0]
    assert [row[0:2] for row in read_history(database)] == [
        (1, "001_schema_versions"),
        (2, "002_workspaces"),
    ]
    with database.read_connection() as connection:
        assert connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'workspaces'"
        ).fetchone()["name"] == "workspaces"


def test_workspace_migration_enforces_the_root_path_key_unique_constraint(tmp_path: Path) -> None:
    database = make_database(tmp_path)
    MigrationRunner(database, clock=fixed_clock).run()
    workspace = (
        "workspace-1",
        "First",
        r"C:\work\first",
        r"c:\work\same",
        "2026-08-16T08:00:00.000Z",
        "2026-08-16T08:00:00.000Z",
        "2026-08-16T08:00:00.000Z",
    )

    with database.transaction() as connection:
        connection.execute(
            """
            INSERT INTO workspaces (
                id, name, root_path, root_path_key, created_at, updated_at, last_opened_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            workspace,
        )

    with pytest.raises(sqlite3.IntegrityError):
        with database.transaction() as connection:
            connection.execute(
                """
                INSERT INTO workspaces (
                    id, name, root_path, root_path_key, created_at, updated_at, last_opened_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                ("workspace-2", *workspace[1:]),
            )


def test_runner_applies_test_migrations_in_registry_order(tmp_path: Path) -> None:
    database = make_database(tmp_path)
    execution_order: list[int] = []

    def upgrade_first(connection: sqlite3.Connection) -> None:
        execution_order.append(1)
        connection.execute("CREATE TABLE test_events (value TEXT NOT NULL)")

    def upgrade_second(connection: sqlite3.Connection) -> None:
        execution_order.append(2)
        connection.execute("INSERT INTO test_events (value) VALUES ('second')")

    migrations = (
        make_migration(1, "001_test_events", upgrade_first),
        make_migration(2, "002_insert_event", upgrade_second),
    )

    MigrationRunner(database, migrations, clock=fixed_clock).run()

    assert execution_order == [1, 2]
    assert [row[0] for row in read_history(database)] == [1, 2]
    with database.read_connection() as connection:
        assert connection.execute("SELECT value FROM test_events").fetchone()["value"] == "second"


@pytest.mark.parametrize(
    ("replacement", "message"),
    [
        (
            lambda original: make_migration(1, "001_renamed", original.upgrade),
            "name drift",
        ),
        (
            lambda original: Migration(
                version=1,
                name=original.name,
                checksum_source="-- changed migration content",
                upgrade=original.upgrade,
            ),
            "checksum drift",
        ),
    ],
)
def test_runner_rejects_name_or_checksum_drift(
    tmp_path: Path,
    replacement: object,
    message: str,
) -> None:
    database = make_database(tmp_path)
    original = make_migration(1, "001_original", lambda _connection: None)
    MigrationRunner(database, (original,), clock=fixed_clock).run()

    with pytest.raises(MigrationHistoryError, match=message):
        MigrationRunner(database, (replacement(original),), clock=fixed_clock).run()  # type: ignore[operator]


def test_runner_rejects_unknown_or_gapped_applied_versions(tmp_path: Path) -> None:
    database = make_database(tmp_path)
    MigrationRunner(database, clock=fixed_clock).run()

    with database.transaction() as connection:
        connection.execute(
            "INSERT INTO schema_versions (version, name, checksum, applied_at) VALUES (3, ?, ?, ?)",
            ("003_unknown", "unknown", FIXED_TIME.isoformat()),
        )

    with pytest.raises(MigrationHistoryError, match="unknown applied migration version"):
        MigrationRunner(database, clock=fixed_clock).run()

    with database.transaction() as connection:
        connection.execute("DELETE FROM schema_versions")
        connection.execute(
            "INSERT INTO schema_versions (version, name, checksum, applied_at) VALUES (4, ?, ?, ?)",
            ("004_gapped", "gapped", FIXED_TIME.isoformat()),
        )

    with pytest.raises(MigrationHistoryError, match="contiguous prefix"):
        MigrationRunner(database, clock=fixed_clock).run()


def test_failed_migration_rolls_back_its_schema_and_history_but_keeps_prior_versions(
    tmp_path: Path,
) -> None:
    database = make_database(tmp_path)
    expected_error = RuntimeError("migration two failed")

    def upgrade_first(connection: sqlite3.Connection) -> None:
        connection.execute("CREATE TABLE completed_work (id INTEGER PRIMARY KEY)")

    def upgrade_second(connection: sqlite3.Connection) -> None:
        connection.execute("CREATE TABLE rolled_back_work (id INTEGER PRIMARY KEY)")
        connection.execute("INSERT INTO rolled_back_work (id) VALUES (1)")
        raise expected_error

    migrations = (
        make_migration(1, "001_completed_work", upgrade_first),
        make_migration(2, "002_rolled_back_work", upgrade_second),
    )

    with pytest.raises(RuntimeError) as raised:
        MigrationRunner(database, migrations, clock=fixed_clock).run()

    assert raised.value is expected_error
    assert [row[0] for row in read_history(database)] == [1]
    with database.read_connection() as connection:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'rolled_back_work'"
        ).fetchall()

    assert tables == []


def test_failed_workspace_migration_rolls_back_its_table_and_version_two_history(
    tmp_path: Path,
) -> None:
    database = make_database(tmp_path)

    def fail_after_workspace_ddl(connection: sqlite3.Connection) -> None:
        V002_WORKSPACES.upgrade(connection)
        raise RuntimeError("controlled workspace migration failure")

    failing_workspace_migration = Migration(
        version=2,
        name=V002_WORKSPACES.name,
        checksum_source=V002_WORKSPACES.checksum_source,
        upgrade=fail_after_workspace_ddl,
    )

    with pytest.raises(RuntimeError, match="controlled workspace migration failure"):
        MigrationRunner(
            database,
            (V001_SCHEMA_VERSIONS, failing_workspace_migration),
            clock=fixed_clock,
        ).run()

    assert [row[0:2] for row in read_history(database)] == [(1, "001_schema_versions")]
    with database.read_connection() as connection:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'workspaces'"
        ).fetchall()
    assert tables == []


def test_runner_import_has_no_filesystem_side_effects(tmp_path: Path) -> None:
    environment = os.environ.copy()
    existing_pythonpath = environment.get("PYTHONPATH")
    environment["PYTHONPATH"] = (
        f"{SOURCE_ROOT}{os.pathsep}{existing_pythonpath}"
        if existing_pythonpath
        else str(SOURCE_ROOT)
    )
    environment["PYTHONDONTWRITEBYTECODE"] = "1"

    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from mini_agent.infrastructure.sqlite.migrations.runner import MigrationRunner; print(MigrationRunner.__name__)",
        ],
        cwd=tmp_path,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "MigrationRunner"
    assert list(tmp_path.iterdir()) == []
