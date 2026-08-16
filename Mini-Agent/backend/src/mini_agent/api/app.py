"""FastAPI application factory for the Mini Agent backend."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mini_agent.api.routes.health import UnavailableDatabaseProbe, router as health_router
from mini_agent.config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create the HTTP application without opening runtime resources.

    P02 extends the lifespan body with data-directory creation, SQLite migration,
    and the real database probe. Keeping those steps here preserves one startup
    path for both the local entry point and tests.
    """

    resolved_settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = resolved_settings
        if not hasattr(app.state, "database_probe"):
            app.state.database_probe = UnavailableDatabaseProbe()
        yield

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=[],
    )
    app.include_router(health_router)
    return app
