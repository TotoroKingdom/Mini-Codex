"""Local startup entry point for the Mini Agent backend."""

from __future__ import annotations

import uvicorn

from mini_agent.api.app import create_app
from mini_agent.config import Settings


def main() -> None:
    """Start Uvicorn with the same Settings and App Factory used by tests."""
    settings = Settings()
    app = create_app(settings)
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
