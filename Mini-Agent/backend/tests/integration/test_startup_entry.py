"""Tests for the local startup entry point without starting a Uvicorn process."""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from mini_agent import __main__ as entrypoint
from mini_agent.config import Settings


def test_main_wires_the_same_settings_into_factory_and_uvicorn(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    settings = Settings(
        environment="test",
        host="127.0.0.2",
        port=8765,
        data_dir=tmp_path / "data-not-created",
        cors_origins=("http://localhost:5173",),
        log_level="WARNING",
        _env_file=None,
    )
    application = object()
    factory_settings: list[Settings] = []
    uvicorn_calls: list[dict[str, object]] = []

    monkeypatch.setattr(entrypoint, "Settings", lambda: settings)

    def fake_create_app(supplied_settings: Settings) -> object:
        factory_settings.append(supplied_settings)
        return application

    def fake_run(app: object, **kwargs: object) -> None:
        uvicorn_calls.append({"app": app, **kwargs})

    monkeypatch.setattr(entrypoint, "create_app", fake_create_app)
    monkeypatch.setattr(entrypoint.uvicorn, "run", fake_run)

    entrypoint.main()

    assert factory_settings == [settings]
    assert uvicorn_calls == [
        {
            "app": application,
            "host": "127.0.0.2",
            "port": 8765,
            "log_level": "warning",
        }
    ]


def test_invalid_settings_fail_before_uvicorn_starts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MINI_AGENT_PORT", "0")
    monkeypatch.setattr(entrypoint, "Settings", lambda: Settings(_env_file=None))
    uvicorn_started = False

    def fake_run(*_args: object, **_kwargs: object) -> None:
        nonlocal uvicorn_started
        uvicorn_started = True

    monkeypatch.setattr(entrypoint.uvicorn, "run", fake_run)

    with pytest.raises(ValidationError):
        entrypoint.main()

    assert not uvicorn_started
