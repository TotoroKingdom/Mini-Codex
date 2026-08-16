"""M03 P01 SQLite 启动生命周期的端到端回归测试。"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from mini_agent.api.app import create_app
from mini_agent.config import Settings
from mini_agent.infrastructure.sqlite.database import DATABASE_FILENAME


def make_settings(data_dir: Path) -> Settings:
    return Settings(
        environment="test",
        data_dir=data_dir,
        cors_origins=("http://localhost:5173",),
        _env_file=None,
    )


def read_schema_and_history(database_path: Path) -> tuple[list[str], list[tuple[object, ...]]]:
    connection = sqlite3.connect(database_path)
    try:
        tables = [
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
            )
        ]
        history = connection.execute(
            "SELECT version, name, checksum, applied_at FROM schema_versions ORDER BY version"
        ).fetchall()
    finally:
        connection.close()

    return tables, history


def test_empty_data_dir_startup_and_restart_preserve_the_minimal_production_schema(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "empty-data"
    settings = make_settings(data_dir)
    database_path = data_dir / DATABASE_FILENAME

    assert not data_dir.exists()
    with TestClient(create_app(settings)) as client:
        first_health = client.get("/api/health")

    assert first_health.status_code == 200
    assert first_health.json() == {
        "status": "ok",
        "service": "mini-agent-backend",
        "api_version": "v1",
        "database": {"status": "ready", "schema_version": 2},
    }
    assert {path.name for path in data_dir.iterdir()} == {DATABASE_FILENAME}

    first_tables, first_history = read_schema_and_history(database_path)
    assert first_tables == ["schema_versions", "workspaces"]
    assert len(first_history) == 2
    assert first_history[0][0:2] == (1, "001_schema_versions")
    assert first_history[1][0:2] == (2, "002_workspaces")
    assert isinstance(first_history[0][2], str) and len(first_history[0][2]) == 64
    assert isinstance(first_history[0][3], str) and first_history[0][3]

    with TestClient(create_app(settings)) as client:
        second_health = client.get("/api/health")

    assert second_health.json() == first_health.json()
    second_tables, second_history = read_schema_and_history(database_path)
    assert second_tables == first_tables
    assert second_history == first_history
