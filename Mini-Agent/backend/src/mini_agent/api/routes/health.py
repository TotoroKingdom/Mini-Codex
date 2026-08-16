"""Health route and its replaceable database probe dependency."""

from __future__ import annotations

from typing import Annotated, Protocol

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from mini_agent.api.schemas.health import HealthResponse


class DatabaseProbe(Protocol):
    """Minimal dependency required by the health route.

    P02 will provide the SQLite-backed implementation. A successful probe returns
    the current schema version; failures are converted to a degraded response.
    """

    def probe(self) -> int: ...


class DatabaseUnavailableError(RuntimeError):
    """Signals that a database probe cannot establish readiness."""


class UnavailableDatabaseProbe:
    """P01 default that prevents the service from claiming database readiness."""

    def probe(self) -> int:
        raise DatabaseUnavailableError("No database probe has been configured.")


router = APIRouter()


def get_database_probe(request: Request) -> DatabaseProbe:
    """Read the application-provided probe, defaulting safely to unavailable."""
    probe = getattr(request.app.state, "database_probe", None)
    return probe if probe is not None else UnavailableDatabaseProbe()


def health_response(body: HealthResponse, response_status: int) -> JSONResponse:
    """Serialize a stable, non-cacheable public health response."""
    return JSONResponse(
        content=body.model_dump(mode="json"),
        status_code=response_status,
        headers={"Cache-Control": "no-store"},
    )


@router.get(
    "/api/health",
    response_model=HealthResponse,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": HealthResponse}},
)
def get_health(
    database_probe: Annotated[DatabaseProbe, Depends(get_database_probe)],
) -> JSONResponse:
    """Report database-backed readiness without exposing probe failure details."""
    try:
        response = HealthResponse.ready(database_probe.probe())
    except Exception:
        response = HealthResponse.degraded()
        return health_response(response, status.HTTP_503_SERVICE_UNAVAILABLE)

    return health_response(response, status.HTTP_200_OK)
