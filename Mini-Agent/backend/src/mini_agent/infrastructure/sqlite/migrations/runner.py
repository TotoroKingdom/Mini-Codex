"""Ordered, transactional execution of the local SQLite migrations."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import datetime, timezone

from mini_agent.infrastructure.sqlite.database import Database
from mini_agent.infrastructure.sqlite.migrations.model import Migration
from mini_agent.infrastructure.sqlite.migrations.registry import MIGRATIONS, validate_registry
from mini_agent.infrastructure.sqlite.migrations.versions.v001_schema_versions import (
    SCHEMA_VERSIONS_DDL,
)


Clock = Callable[[], datetime]


class MigrationHistoryError(RuntimeError):
    """Raised when persisted migration history is not this registry's prefix."""


def utc_now() -> datetime:
    """Return the current UTC time through an injectable runner boundary."""
    return datetime.now(timezone.utc)


class MigrationRunner:
    """Apply one validated migration registry to a database, in order."""

    def __init__(
        self,
        database: Database,
        migrations: Iterable[Migration] = MIGRATIONS,
        *,
        clock: Clock = utc_now,
    ) -> None:
        self._database = database
        self._migrations = validate_registry(migrations)
        self._clock = clock

    def run(self) -> None:
        """Bootstrap metadata, reject drift, then atomically apply pending upgrades."""
        self._ensure_schema_versions_table()
        applied = self._read_applied_migrations()
        self._validate_applied_prefix(applied)

        for migration in self._migrations[len(applied) :]:
            self._apply_migration(migration)

    def _ensure_schema_versions_table(self) -> None:
        """Perform the sole allowed unversioned DDL before reading migration history."""
        with self._database.transaction() as connection:
            connection.execute(SCHEMA_VERSIONS_DDL)

    def _read_applied_migrations(self) -> tuple[tuple[int, str, str], ...]:
        with self._database.read_connection() as connection:
            rows = connection.execute(
                "SELECT version, name, checksum FROM schema_versions ORDER BY version"
            ).fetchall()

        return tuple((int(row["version"]), str(row["name"]), str(row["checksum"])) for row in rows)

    def _validate_applied_prefix(self, applied: tuple[tuple[int, str, str], ...]) -> None:
        for expected_version, (version, name, checksum) in enumerate(applied, start=1):
            if version != expected_version:
                raise MigrationHistoryError(
                    "Applied migration versions must form a contiguous prefix from version 1."
                )

            if version > len(self._migrations):
                raise MigrationHistoryError(
                    f"Database contains unknown applied migration version {version}."
                )

            migration = self._migrations[version - 1]
            if name != migration.name:
                raise MigrationHistoryError(
                    f"Migration name drift detected at version {version}."
                )
            if checksum != migration.checksum:
                raise MigrationHistoryError(
                    f"Migration checksum drift detected at version {version}."
                )

    def _apply_migration(self, migration: Migration) -> None:
        applied_at = self._utc_iso_timestamp()
        with self._database.transaction() as connection:
            migration.upgrade(connection)
            connection.execute(
                """
                INSERT INTO schema_versions (version, name, checksum, applied_at)
                VALUES (?, ?, ?, ?)
                """,
                (migration.version, migration.name, migration.checksum, applied_at),
            )

    def _utc_iso_timestamp(self) -> str:
        timestamp = self._clock()
        if not isinstance(timestamp, datetime):
            raise TypeError("Migration clock must return a datetime.")
        if timestamp.tzinfo is None:
            raise ValueError("Migration clock must return a timezone-aware UTC datetime.")

        return timestamp.astimezone(timezone.utc).isoformat()
