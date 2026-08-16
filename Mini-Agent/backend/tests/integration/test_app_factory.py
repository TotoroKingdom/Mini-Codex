"""Integration tests for application factory and lifespan boundaries."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from mini_agent.api.app import create_app
from mini_agent.api.routes.health import UnavailableDatabaseProbe
from mini_agent.config import Settings


def make_settings(data_dir: Path) -> Settings:
    return Settings(
        environment="test",
        host="127.0.0.1",
        port=8000,
        data_dir=data_dir,
        cors_origins=("http://localhost:5173",),
        log_level="INFO",
        _env_file=None,
    )


def test_factory_uses_injected_settings_without_runtime_filesystem_side_effects(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data-not-created"
    settings = make_settings(data_dir)

    app = create_app(settings)

    assert not data_dir.exists()
    assert not hasattr(app.state, "settings")
    assert not hasattr(app.state, "database_probe")

    with TestClient(app):
        assert app.state.settings is settings
        assert isinstance(app.state.database_probe, UnavailableDatabaseProbe)
        assert not data_dir.exists()


def test_factories_keep_their_injected_settings_isolated(tmp_path: Path) -> None:
    first_settings = make_settings(tmp_path / "first-data")
    second_settings = make_settings(tmp_path / "second-data")

    first_app = create_app(first_settings)
    second_app = create_app(second_settings)

    with TestClient(first_app), TestClient(second_app):
        assert first_app.state.settings is first_settings
        assert second_app.state.settings is second_settings
        assert first_app.state.settings.data_dir != second_app.state.settings.data_dir
