"""Unit tests for the SQLite connection, transaction, and probe boundary."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from mini_agent.infrastructure.sqlite.database import (
    DATABASE_FILENAME,
    DEFAULT_BUSY_TIMEOUT_MS,
    Database,
    DatabaseProbeError,
)


def make_database(tmp_path: Path) -> Database:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    return Database(data_dir)


def test_database_path_is_fixed_below_the_resolved_data_directory(tmp_path: Path) -> None:
    database = make_database(tmp_path)

    assert database.database_path == tmp_path / "data" / DATABASE_FILENAME


def test_database_construction_does_not_create_the_data_directory(tmp_path: Path) -> None:
    data_dir = tmp_path / "data-not-created"

    database = Database(data_dir)

    assert database.database_path == data_dir / DATABASE_FILENAME
    assert not data_dir.exists()


def test_connection_policy_enables_pragmas_row_access_and_reports_actual_journal_mode(
    tmp_path: Path,
) -> None:
    database = make_database(tmp_path)

    with database.read_connection() as connection:
        foreign_keys = connection.execute("PRAGMA foreign_keys").fetchone()[0]
        busy_timeout = connection.execute("PRAGMA busy_timeout").fetchone()[0]
        journal_mode = connection.execute("PRAGMA journal_mode").fetchone()[0]
        row = connection.execute("SELECT 7 AS value").fetchone()

    assert foreign_keys == 1
    assert busy_timeout == DEFAULT_BUSY_TIMEOUT_MS
    assert journal_mode in {"wal", "delete", "truncate", "persist", "memory", "off"}
    assert isinstance(row, sqlite3.Row)
    assert row["value"] == 7


def test_read_connection_closes_after_context_exit(tmp_path: Path) -> None:
    database = make_database(tmp_path)

    with database.read_connection() as connection:
        connection.execute("SELECT 1")

    with pytest.raises(sqlite3.ProgrammingError):
        connection.execute("SELECT 1")


def test_transaction_commits_and_closes_after_success(tmp_path: Path) -> None:
    database = make_database(tmp_path)

    with database.transaction() as connection:
        connection.execute("CREATE TABLE entries (value TEXT NOT NULL)")
        connection.execute("INSERT INTO entries (value) VALUES ('committed')")

    with database.read_connection() as read_connection:
        row = read_connection.execute("SELECT value FROM entries").fetchone()

    assert row["value"] == "committed"
    with pytest.raises(sqlite3.ProgrammingError):
        connection.execute("SELECT 1")


def test_transaction_rolls_back_and_preserves_the_original_exception(tmp_path: Path) -> None:
    database = make_database(tmp_path)
    expected_error = RuntimeError("original transaction failure")

    with pytest.raises(RuntimeError) as raised:
        with database.transaction() as connection:
            connection.execute("CREATE TABLE entries (value TEXT NOT NULL)")
            connection.execute("INSERT INTO entries (value) VALUES ('rolled back')")
            raise expected_error

    assert raised.value is expected_error
    with database.read_connection() as read_connection:
        tables = read_connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entries'"
        ).fetchall()

    assert tables == []
    with pytest.raises(sqlite3.ProgrammingError):
        connection.execute("SELECT 1")


def test_foreign_key_enforcement_is_enabled_for_every_connection(tmp_path: Path) -> None:
    database = make_database(tmp_path)

    with database.transaction() as connection:
        connection.execute("CREATE TABLE parents (id INTEGER PRIMARY KEY)")
        connection.execute(
            "CREATE TABLE children (parent_id INTEGER NOT NULL REFERENCES parents(id))"
        )

    with pytest.raises(sqlite3.IntegrityError):
        with database.transaction() as connection:
            connection.execute("INSERT INTO children (parent_id) VALUES (999)")


def test_probe_returns_the_current_maximum_schema_version(tmp_path: Path) -> None:
    database = make_database(tmp_path)

    with database.transaction() as connection:
        connection.execute("CREATE TABLE schema_versions (version INTEGER PRIMARY KEY)")
        connection.executemany("INSERT INTO schema_versions (version) VALUES (?)", [(1,), (3,), (2,)])

    assert database.probe() == 3


def test_probe_failure_is_safe_and_does_not_leak_the_database_path(tmp_path: Path) -> None:
    database = make_database(tmp_path)

    with pytest.raises(DatabaseProbeError) as raised:
        database.probe()

    assert str(database.database_path) not in str(raised.value)
    assert "Database health probe" in str(raised.value)


def test_database_rejects_an_unbounded_busy_timeout(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="busy timeout"):
        Database(tmp_path, busy_timeout_ms=0)
