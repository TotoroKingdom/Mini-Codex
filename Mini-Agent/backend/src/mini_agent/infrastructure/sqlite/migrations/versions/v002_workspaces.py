"""Workspace 持久化表的 Version 2 迁移。"""

from __future__ import annotations

import sqlite3

from mini_agent.infrastructure.sqlite.migrations.model import Migration


WORKSPACES_DDL = """
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    root_path_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_opened_at TEXT NOT NULL
);
"""


def upgrade(connection: sqlite3.Connection) -> None:
    """在 Runner 的单迁移事务内创建唯一的 Workspace 业务表。"""
    connection.execute(WORKSPACES_DDL)


MIGRATION = Migration(
    version=2,
    name="002_workspaces",
    checksum_source=WORKSPACES_DDL,
    upgrade=upgrade,
)
