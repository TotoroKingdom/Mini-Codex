"""Baseline migration for SQLite schema version metadata."""

from __future__ import annotations

import sqlite3

from mini_agent.infrastructure.sqlite.migrations.model import Migration


SCHEMA_VERSIONS_DDL = """
CREATE TABLE IF NOT EXISTS schema_versions (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL
);
"""


def upgrade(connection: sqlite3.Connection) -> None:
    """Create the only M02 production table when the Runner applies the baseline."""
    connection.execute(SCHEMA_VERSIONS_DDL)


MIGRATION = Migration(
    version=1,
    name="001_schema_versions",
    checksum_source=SCHEMA_VERSIONS_DDL,
    upgrade=upgrade,
)
