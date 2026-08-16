"""FastAPI application factory for the Mini Agent backend."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mini_agent.api.routes.health import router as health_router
from mini_agent.api.routes.workspaces import router as workspaces_router
from mini_agent.application.workspaces.service import (
    UtcClock,
    UuidWorkspaceIdGenerator,
    WorkspaceService,
)
from mini_agent.config import Settings
from mini_agent.infrastructure.sqlite.database import Database
from mini_agent.infrastructure.sqlite.migrations.runner import MigrationRunner
from mini_agent.infrastructure.sqlite.workspace_repository import SQLiteWorkspaceRepository
from mini_agent.infrastructure.workspaces.windows_path_resolver import WindowsWorkspacePathResolver


class DataDirectoryError(RuntimeError):
    """Raised when the configured runtime data directory cannot be prepared."""


def _create_data_directory(data_dir: Path) -> None:
    """Create the resolved runtime directory without exposing its path on failure."""
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
    except OSError as error:
        raise DataDirectoryError("The application data directory is unavailable.") from error


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create the HTTP application without opening runtime resources."""

    resolved_settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = resolved_settings
        _create_data_directory(resolved_settings.data_dir)
        database = Database(resolved_settings.data_dir)
        MigrationRunner(database).run()
        database.probe()

        # 仅在数据库已迁移并确认可用后装配完整服务，避免发布半就绪依赖。
        workspace_service = WorkspaceService(
            repository=SQLiteWorkspaceRepository(database),
            path_resolver=WindowsWorkspacePathResolver(),
            id_generator=UuidWorkspaceIdGenerator(),
            clock=UtcClock(),
        )
        app.state.database = database
        app.state.database_probe = database
        app.state.workspace_service = workspace_service
        yield

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Content-Type"],
    )
    app.include_router(health_router)
    app.include_router(workspaces_router)
    return app
