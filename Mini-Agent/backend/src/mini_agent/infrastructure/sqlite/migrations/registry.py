"""The ordered production migration registry."""

from __future__ import annotations

from collections.abc import Iterable

from mini_agent.infrastructure.sqlite.migrations.model import Migration
from mini_agent.infrastructure.sqlite.migrations.versions.v001_schema_versions import (
    MIGRATION as V001_SCHEMA_VERSIONS,
)


class MigrationRegistryError(ValueError):
    """Raised when a migration registry violates its ordering invariants."""


def validate_registry(migrations: Iterable[Migration]) -> tuple[Migration, ...]:
    """Validate and freeze an ordered, contiguous migration sequence."""
    registry = tuple(migrations)
    if not registry:
        raise MigrationRegistryError("Migration registry must contain version 1.")

    seen_versions: set[int] = set()
    seen_names: set[str] = set()
    for expected_version, migration in enumerate(registry, start=1):
        if migration.version in seen_versions:
            raise MigrationRegistryError(f"Duplicate migration version: {migration.version}.")
        if migration.name in seen_names:
            raise MigrationRegistryError(f"Duplicate migration name: {migration.name}.")
        if migration.version != expected_version:
            raise MigrationRegistryError(
                "Migration versions must start at 1 and increase without gaps."
            )
        seen_versions.add(migration.version)
        seen_names.add(migration.name)

    return registry


MIGRATIONS = validate_registry((V001_SCHEMA_VERSIONS,))
