"""Workspace HTTP Schema 与领域错误映射的单元契约测试。"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from mini_agent.api.schemas.workspaces import (
    CreateWorkspaceRequest,
    RenameWorkspaceRequest,
    WorkspaceErrorEnvelope,
    WorkspaceListResponse,
    WorkspaceResponse,
)
from mini_agent.api.workspace_errors import map_workspace_error
from mini_agent.application.workspaces.service import WorkspaceWithAvailability
from mini_agent.domain.workspaces.errors import (
    WorkspaceAlreadyExistsError,
    WorkspaceDomainError,
    WorkspaceNameInvalidError,
    WorkspaceNotFoundError,
    WorkspacePathInaccessibleError,
    WorkspacePathInvalidError,
    WorkspacePathMissingError,
    WorkspacePathNotDirectoryError,
    WorkspacePersistenceError,
)
from mini_agent.domain.workspaces.model import Workspace, WorkspaceAvailability


CREATED_AT = "2026-08-16T08:00:00.000Z"


def make_workspace(**changes: str) -> Workspace:
    values = {
        "id": "workspace-1",
        "name": "Mini Agent",
        "root_path": r"C:\\work\\mini-agent",
        "root_path_key": r"c:\\work\\mini-agent",
        "created_at": CREATED_AT,
        "updated_at": CREATED_AT,
        "last_opened_at": CREATED_AT,
    }
    values.update(changes)
    return Workspace(**values)


@pytest.mark.parametrize(
    ("error", "status_code", "payload"),
    [
        (WorkspaceNotFoundError(), 404, {"code": "workspace_not_found", "message": "The workspace was not found."}),
        (
            WorkspaceAlreadyExistsError(workspace_id="existing-1"),
            409,
            {
                "code": "workspace_already_exists",
                "message": "The workspace has already been added.",
                "field": "root_path",
                "workspace_id": "existing-1",
            },
        ),
        (
            WorkspaceNameInvalidError(),
            422,
            {"code": "workspace_name_invalid", "message": "The workspace name is invalid.", "field": "name"},
        ),
        (
            WorkspacePathInvalidError(),
            422,
            {"code": "workspace_path_invalid", "message": "The workspace path is invalid.", "field": "root_path"},
        ),
        (
            WorkspacePathMissingError(),
            422,
            {"code": "workspace_path_missing", "message": "The workspace path does not exist.", "field": "root_path"},
        ),
        (
            WorkspacePathNotDirectoryError(),
            422,
            {"code": "workspace_path_not_directory", "message": "The workspace path is not a directory.", "field": "root_path"},
        ),
        (
            WorkspacePathInaccessibleError(),
            403,
            {"code": "workspace_path_inaccessible", "message": "The workspace path is inaccessible.", "field": "root_path"},
        ),
        (
            WorkspacePersistenceError(),
            500,
            {"code": "workspace_persistence_failed", "message": "The workspace could not be saved."},
        ),
    ],
)
def test_domain_errors_map_to_exact_safe_http_contract(
    error: WorkspaceDomainError,
    status_code: int,
    payload: dict[str, str],
) -> None:
    mapped = map_workspace_error(error)

    assert mapped.status_code == status_code
    assert mapped.body.model_dump(exclude_none=True) == {"error": payload}


def test_unknown_domain_error_maps_to_safe_persistence_failure() -> None:
    class UnsafeDomainError(WorkspaceDomainError):
        code = "unsafe"
        message = "SELECT * FROM workspaces C:\\private\\data.db Traceback OSError"

    mapped = map_workspace_error(UnsafeDomainError())

    assert mapped.status_code == 500
    assert mapped.body.model_dump(exclude_none=True) == {
        "error": {
            "code": "workspace_persistence_failed",
            "message": "The workspace could not be saved.",
        }
    }


def test_create_request_is_strict_and_name_is_optional() -> None:
    assert CreateWorkspaceRequest.model_validate({"root_path": r"C:\\work\\mini-agent"}).model_dump() == {
        "root_path": r"C:\\work\\mini-agent",
        "name": None,
    }
    assert CreateWorkspaceRequest.model_validate(
        {"root_path": r"C:\\work\\mini-agent", "name": "Mini Agent"}
    ).name == "Mini Agent"

    with pytest.raises(ValidationError):
        CreateWorkspaceRequest.model_validate({"root_path": r"C:\\work", "unexpected": True})
    with pytest.raises(ValidationError):
        CreateWorkspaceRequest.model_validate({"root_path": 42})


def test_rename_request_requires_only_name_and_rejects_root_updates() -> None:
    assert RenameWorkspaceRequest.model_validate({"name": "Renamed"}).name == "Renamed"

    with pytest.raises(ValidationError):
        RenameWorkspaceRequest.model_validate({})
    with pytest.raises(ValidationError):
        RenameWorkspaceRequest.model_validate({"name": "Renamed", "root_path": r"C:\\other"})


def test_workspace_response_exposes_only_public_fields_and_fixed_values() -> None:
    response = WorkspaceResponse.from_result(
        WorkspaceWithAvailability(
            workspace=make_workspace(),
            availability=WorkspaceAvailability.AVAILABLE,
        )
    )

    assert response.model_dump() == {
        "id": "workspace-1",
        "name": "Mini Agent",
        "root_path": r"C:\\work\\mini-agent",
        "availability": "available",
        "created_at": CREATED_AT,
        "updated_at": CREATED_AT,
        "last_opened_at": CREATED_AT,
    }
    assert "root_path_key" not in response.model_dump()


@pytest.mark.parametrize("availability", ["available", "missing", "not_directory", "inaccessible"])
def test_workspace_response_accepts_only_contract_availability_values(availability: str) -> None:
    response = WorkspaceResponse.model_validate(
        {
            "id": "workspace-1",
            "name": "Mini Agent",
            "root_path": r"C:\\work\\mini-agent",
            "availability": availability,
            "created_at": CREATED_AT,
            "updated_at": CREATED_AT,
            "last_opened_at": CREATED_AT,
        }
    )

    assert response.availability == availability
    with pytest.raises(ValidationError):
        WorkspaceResponse.model_validate({**response.model_dump(), "root_path_key": "internal"})
    with pytest.raises(ValidationError):
        WorkspaceResponse.model_validate({**response.model_dump(), "availability": "unknown"})


def test_workspace_response_requires_fixed_millisecond_timestamps() -> None:
    payload = {
        "id": "workspace-1",
        "name": "Mini Agent",
        "root_path": r"C:\\work\\mini-agent",
        "availability": "available",
        "created_at": "2026-08-16T08:00:00Z",
        "updated_at": CREATED_AT,
        "last_opened_at": CREATED_AT,
    }

    with pytest.raises(ValidationError):
        WorkspaceResponse.model_validate(payload)


def test_list_response_is_a_strict_items_envelope() -> None:
    item = WorkspaceResponse.from_result(
        WorkspaceWithAvailability(make_workspace(), WorkspaceAvailability.MISSING)
    )
    response = WorkspaceListResponse(items=[item])

    assert response.model_dump() == {"items": [item.model_dump()]}
    with pytest.raises(ValidationError):
        WorkspaceListResponse.model_validate([item.model_dump()])
    with pytest.raises(ValidationError):
        WorkspaceListResponse.model_validate({"items": [], "next_cursor": "future"})


def test_error_envelope_rejects_internal_or_unknown_fields() -> None:
    with pytest.raises(ValidationError):
        WorkspaceErrorEnvelope.model_validate(
            {
                "error": {
                    "code": "workspace_not_found",
                    "message": "The workspace was not found.",
                    "root_path_key": "internal",
                }
            }
        )
