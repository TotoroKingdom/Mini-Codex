"""Unit tests for migration descriptors, registry validation, and the baseline."""

from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from mini_agent.infrastructure.sqlite.migrations.model import Migration, normalize_checksum_source
from mini_agent.infrastructure.sqlite.migrations.registry import (
    MIGRATIONS,
    MigrationRegistryError,
    validate_registry,
)
from mini_agent.infrastructure.sqlite.migrations.versions.v001_schema_versions import (
    MIGRATION as V001_SCHEMA_VERSIONS,
)


BACKEND_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = BACKEND_ROOT / "src"


def no_op_upgrade(_connection: sqlite3.Connection) -> None:
    """A harmless upgrade used only by descriptor tests."""


def make_migration(version: int, name: str, source: str = "CREATE TABLE sample (id INTEGER);") -> Migration:
    return Migration(version=version, name=name, checksum_source=source, upgrade=no_op_upgrade)


def test_migration_descriptor_exposes_required_fields_and_sha256_checksum() -> None:
    migration = make_migration(1, "001_sample")

    assert migration.version == 1
    assert migration.name == "001_sample"
    assert migration.checksum_source == "CREATE TABLE sample (id INTEGER);"
    assert len(migration.checksum) == 64
    assert int(migration.checksum, 16) >= 0


def test_checksum_normalization_is_stable_but_content_changes_are_detected() -> None:
    unix_source = "CREATE TABLE sample (id INTEGER);\n"
    windows_source = "CREATE TABLE sample (id INTEGER);  \r\n"
    changed_source = "CREATE TABLE sample (id TEXT);\n"

    assert normalize_checksum_source(unix_source) == normalize_checksum_source(windows_source)
    assert make_migration(1, "001_sample", unix_source).checksum == make_migration(
        1, "001_sample", windows_source
    ).checksum
    assert make_migration(1, "001_sample", unix_source).checksum != make_migration(
        1, "001_sample", changed_source
    ).checksum


@pytest.mark.parametrize(
    ("version", "name", "source", "upgrade", "exception"),
    [
        (0, "001_sample", "SELECT 1", no_op_upgrade, ValueError),
        (1, " ", "SELECT 1", no_op_upgrade, ValueError),
        (1, "001_sample", " \n", no_op_upgrade, ValueError),
        (1, "001_sample", "SELECT 1", None, TypeError),
    ],
)
def test_migration_descriptor_rejects_invalid_required_fields(
    version: int,
    name: str,
    source: str,
    upgrade: object,
    exception: type[Exception],
) -> None:
    with pytest.raises(exception):
        Migration(version=version, name=name, checksum_source=source, upgrade=upgrade)  # type: ignore[arg-type]


def test_registry_preserves_a_valid_contiguous_order() -> None:
    first = make_migration(1, "001_first")
    second = make_migration(2, "002_second")

    assert validate_registry((first, second)) == (first, second)


@pytest.mark.parametrize(
    "migrations",
    [
        (),
        (make_migration(2, "002_second"),),
        (make_migration(1, "001_first"), make_migration(3, "003_third")),
        (make_migration(1, "001_first"), make_migration(1, "001_other")),
        (make_migration(1, "001_first"), make_migration(2, "001_first")),
    ],
)
def test_registry_rejects_empty_non_contiguous_and_duplicate_entries(
    migrations: tuple[Migration, ...],
) -> None:
    with pytest.raises(MigrationRegistryError):
        validate_registry(migrations)


def test_production_registry_contains_only_the_version_one_baseline() -> None:
    assert MIGRATIONS == (V001_SCHEMA_VERSIONS,)
    assert V001_SCHEMA_VERSIONS.version == 1
    assert V001_SCHEMA_VERSIONS.name == "001_schema_versions"
    assert not hasattr(V001_SCHEMA_VERSIONS, "downgrade")


def test_baseline_upgrade_creates_only_schema_versions(tmp_path: Path) -> None:
    database_path = tmp_path / "migration-test.db"
    connection = sqlite3.connect(database_path)
    try:
        V001_SCHEMA_VERSIONS.upgrade(connection)
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
        columns = connection.execute("PRAGMA table_info(schema_versions)").fetchall()
    finally:
        connection.close()

    assert tables == [("schema_versions",)]
    assert [(column[1], column[2], column[3], column[5]) for column in columns] == [
        ("version", "INTEGER", 0, 1),
        ("name", "TEXT", 1, 0),
        ("checksum", "TEXT", 1, 0),
        ("applied_at", "TEXT", 1, 0),
    ]


def test_migration_import_has_no_filesystem_side_effects(tmp_path: Path) -> None:
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
            "from mini_agent.infrastructure.sqlite.migrations.registry import MIGRATIONS; print(len(MIGRATIONS))",
        ],
        cwd=tmp_path,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "1"
    assert list(tmp_path.iterdir()) == []
