"""Tests for the centralized backend settings boundary."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from pydantic import ValidationError

from mini_agent.config import DEFAULT_CORS_ORIGINS, PROJECT_ROOT, Settings


@pytest.fixture(autouse=True)
def isolate_mini_agent_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Prevent local developer configuration from influencing these tests."""
    for name in tuple(os.environ):
        if name.startswith("MINI_AGENT_"):
            monkeypatch.delenv(name)


def make_settings(**values: object) -> Settings:
    return Settings(_env_file=None, **values)


def test_defaults_are_stable_and_use_the_backend_project_root() -> None:
    settings = make_settings()

    assert settings.environment == "development"
    assert settings.host == "127.0.0.1"
    assert settings.port == 8000
    assert settings.data_dir == (PROJECT_ROOT / ".data").resolve()
    assert settings.cors_origins == DEFAULT_CORS_ORIGINS
    assert settings.log_level == "INFO"
    assert Path(Settings.model_config["env_file"]) == PROJECT_ROOT / ".env"


def test_all_environment_variables_override_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MINI_AGENT_ENV", "production")
    monkeypatch.setenv("MINI_AGENT_HOST", "127.0.0.2")
    monkeypatch.setenv("MINI_AGENT_PORT", "9123")
    monkeypatch.setenv("MINI_AGENT_DATA_DIR", "configured-data")
    monkeypatch.setenv(
        "MINI_AGENT_CORS_ORIGINS",
        "https://Example.test/,http://127.0.0.1:5174/",
    )
    monkeypatch.setenv("MINI_AGENT_LOG_LEVEL", "debug")

    settings = make_settings()

    assert settings.environment == "production"
    assert settings.host == "127.0.0.2"
    assert settings.port == 9123
    assert settings.data_dir == (PROJECT_ROOT / "configured-data").resolve()
    assert settings.cors_origins == ("https://example.test", "http://127.0.0.1:5174")
    assert settings.log_level == "DEBUG"


def test_explicit_values_override_environment_and_dotenv(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    dotenv_file = tmp_path / ".env"
    dotenv_file.write_text("MINI_AGENT_PORT=9001\n", encoding="utf-8")
    monkeypatch.setenv("MINI_AGENT_PORT", "9002")

    settings = Settings(port=9003, _env_file=dotenv_file)

    assert settings.port == 9003


def test_process_environment_overrides_dotenv(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    dotenv_file = tmp_path / ".env"
    dotenv_file.write_text(
        "MINI_AGENT_HOST=127.0.0.2\nMINI_AGENT_PORT=9001\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("MINI_AGENT_PORT", "9002")

    settings = Settings(_env_file=dotenv_file)

    assert settings.host == "127.0.0.2"
    assert settings.port == 9002


@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("MINI_AGENT_ENV", "staging"),
        ("MINI_AGENT_PORT", "0"),
        ("MINI_AGENT_PORT", "65536"),
        ("MINI_AGENT_PORT", "not-a-number"),
        ("MINI_AGENT_LOG_LEVEL", "trace"),
    ],
)
def test_invalid_scalar_configuration_fails_before_startup(
    monkeypatch: pytest.MonkeyPatch, name: str, value: str
) -> None:
    monkeypatch.setenv(name, value)

    with pytest.raises(ValidationError):
        make_settings()


@pytest.mark.parametrize(
    "origins",
    [
        "*",
        "ftp://example.test",
        "https://example.test/path",
        "https://example.test?query=value",
        "https://*.example.test",
        "https://user@example.test",
        "https://example.test:invalid",
    ],
)
def test_invalid_cors_origins_fail_validation(
    monkeypatch: pytest.MonkeyPatch, origins: str
) -> None:
    monkeypatch.setenv("MINI_AGENT_CORS_ORIGINS", origins)

    with pytest.raises(ValidationError):
        make_settings()


def test_relative_data_directory_is_independent_of_working_directory(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.chdir(PROJECT_ROOT)
    from_project_root = make_settings(data_dir="runtime-data")

    monkeypatch.chdir(tmp_path)
    from_temporary_directory = make_settings(data_dir="runtime-data")

    expected_path = (PROJECT_ROOT / "runtime-data").resolve()
    assert from_project_root.data_dir == expected_path
    assert from_temporary_directory.data_dir == expected_path


def test_settings_do_not_create_the_resolved_data_directory(tmp_path: Path) -> None:
    data_dir = tmp_path / "data-not-created"

    settings = make_settings(data_dir=data_dir)

    assert settings.data_dir == data_dir.resolve()
    assert not data_dir.exists()
