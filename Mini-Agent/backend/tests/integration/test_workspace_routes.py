"""Workspace REST 路由在 Fake Service 下的集成契约测试。"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Callable

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from mini_agent.api.routes.workspaces import get_workspace_service, router
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


def make_result(
    *,
    workspace_id: str = "workspace-1",
    name: str = "Mini Agent",
    root_path: str = r"C:\\work\\mini-agent",
    availability: WorkspaceAvailability = WorkspaceAvailability.AVAILABLE,
) -> WorkspaceWithAvailability:
    workspace = Workspace(
        id=workspace_id,
        name=name,
        root_path=root_path,
        root_path_key=r"c:\\internal\\comparison-key",
        created_at=CREATED_AT,
        updated_at=CREATED_AT,
        last_opened_at=CREATED_AT,
    )
    return WorkspaceWithAvailability(workspace=workspace, availability=availability)


@dataclass
class FakeWorkspaceService:
    """只记录调用参数的可控服务，不访问生命周期或文件系统。"""

    create_result: WorkspaceWithAvailability = field(default_factory=make_result)
    list_result: list[WorkspaceWithAvailability] = field(default_factory=list)
    rename_result: WorkspaceWithAvailability = field(default_factory=make_result)
    open_result: WorkspaceWithAvailability = field(default_factory=make_result)
    error: WorkspaceDomainError | None = None
    calls: list[tuple[object, ...]] = field(default_factory=list)

    def _result_or_error(self, result: WorkspaceWithAvailability) -> WorkspaceWithAvailability:
        if self.error is not None:
            raise self.error
        return result

    def create(self, root_path: str, name: str | None = None) -> WorkspaceWithAvailability:
        self.calls.append(("create", root_path, name))
        return self._result_or_error(self.create_result)

    def list_all(self) -> list[WorkspaceWithAvailability]:
        self.calls.append(("list",))
        if self.error is not None:
            raise self.error
        return self.list_result

    def rename(self, workspace_id: str, name: str) -> WorkspaceWithAvailability:
        self.calls.append(("rename", workspace_id, name))
        return self._result_or_error(self.rename_result)

    def open(self, workspace_id: str) -> WorkspaceWithAvailability:
        self.calls.append(("open", workspace_id))
        return self._result_or_error(self.open_result)


def make_client(service: FakeWorkspaceService) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_workspace_service] = lambda: service
    return TestClient(app)


def response_payload(result: WorkspaceWithAvailability) -> dict[str, str]:
    workspace = result.workspace
    return {
        "id": workspace.id,
        "name": workspace.name,
        "root_path": workspace.root_path,
        "availability": result.availability.value,
        "created_at": workspace.created_at,
        "updated_at": workspace.updated_at,
        "last_opened_at": workspace.last_opened_at,
    }


def test_create_supports_default_and_custom_name_with_json_response() -> None:
    service = FakeWorkspaceService()
    client = make_client(service)

    default_response = client.post("/api/workspaces", json={"root_path": r"C:\\work\\mini-agent"})
    custom_response = client.post(
        "/api/workspaces",
        json={"root_path": r"C:\\work\\mini-agent", "name": "Custom Name"},
    )

    assert default_response.status_code == custom_response.status_code == 201
    assert default_response.headers["content-type"].startswith("application/json")
    assert default_response.json() == response_payload(service.create_result)
    assert service.calls == [
        ("create", r"C:\\work\\mini-agent", None),
        ("create", r"C:\\work\\mini-agent", "Custom Name"),
    ]


def test_list_returns_items_envelope_in_service_order() -> None:
    first = make_result(workspace_id="workspace-2", name="Second")
    second = make_result(workspace_id="workspace-1", name="First", availability=WorkspaceAvailability.MISSING)
    service = FakeWorkspaceService(list_result=[first, second])
    client = make_client(service)

    response = client.get("/api/workspaces")

    assert response.status_code == 200
    assert response.json() == {"items": [response_payload(first), response_payload(second)]}
    assert service.calls == [("list",)]


def test_rename_calls_service_with_path_parameter_and_name_only() -> None:
    result = make_result(workspace_id="workspace-9", name="Renamed")
    service = FakeWorkspaceService(rename_result=result)
    client = make_client(service)

    response = client.patch("/api/workspaces/workspace-9", json={"name": "Renamed"})

    assert response.status_code == 200
    assert response.json() == response_payload(result)
    assert service.calls == [("rename", "workspace-9", "Renamed")]


def test_open_calls_service_with_only_path_parameter() -> None:
    result = make_result(workspace_id="workspace-9")
    service = FakeWorkspaceService(open_result=result)
    client = make_client(service)

    response = client.post("/api/workspaces/workspace-9/open")

    assert response.status_code == 200
    assert response.json() == response_payload(result)
    assert service.calls == [("open", "workspace-9")]


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("post", "/api/workspaces", {"root_path": r"C:\\work", "unexpected": True}),
        ("post", "/api/workspaces", {"name": "Missing root"}),
        ("patch", "/api/workspaces/workspace-1", {"name": "Renamed", "root_path": r"C:\\other"}),
        ("patch", "/api/workspaces/workspace-1", {"root_path": r"C:\\other"}),
    ],
)
def test_unknown_or_invalid_command_shape_returns_standard_validation_422(
    method: str,
    path: str,
    body: dict[str, object],
) -> None:
    service = FakeWorkspaceService()
    client = make_client(service)

    response = getattr(client, method)(path, json=body)

    assert response.status_code == 422
    assert "workspace_" not in str(response.json())
    assert service.calls == []


@pytest.mark.parametrize(
    ("path", "body"),
    [
        ("/api/workspaces", "not-json"),
        ("/api/workspaces/workspace-1", "not-json"),
    ],
)
def test_malformed_json_returns_standard_validation_422(path: str, body: str) -> None:
    service = FakeWorkspaceService()
    client = make_client(service)
    method: Callable[..., object] = client.post if path == "/api/workspaces" else client.patch

    response = method(path, content=body, headers={"Content-Type": "application/json"})

    assert response.status_code == 422
    assert "workspace_" not in str(response.json())
    assert service.calls == []


def test_wrong_content_type_returns_safe_validation_422() -> None:
    service = FakeWorkspaceService()
    client = make_client(service)

    response = client.post(
        "/api/workspaces",
        content='{"root_path":"C:\\\\work"}',
        headers={"Content-Type": "text/plain"},
    )

    assert response.status_code == 422
    assert service.calls == []


@pytest.mark.parametrize(
    ("method", "path", "body", "error", "status_code", "code"),
    [
        ("post", "/api/workspaces", {"root_path": r"C:\\work"}, WorkspaceNotFoundError(), 404, "workspace_not_found"),
        (
            "post",
            "/api/workspaces",
            {"root_path": r"C:\\work"},
            WorkspaceAlreadyExistsError(workspace_id="existing-1"),
            409,
            "workspace_already_exists",
        ),
        ("patch", "/api/workspaces/workspace-1", {"name": "Bad"}, WorkspaceNameInvalidError(), 422, "workspace_name_invalid"),
        ("post", "/api/workspaces", {"root_path": r"C:\\work"}, WorkspacePathInvalidError(), 422, "workspace_path_invalid"),
        ("post", "/api/workspaces", {"root_path": r"C:\\work"}, WorkspacePathMissingError(), 422, "workspace_path_missing"),
        (
            "post",
            "/api/workspaces",
            {"root_path": r"C:\\work"},
            WorkspacePathNotDirectoryError(),
            422,
            "workspace_path_not_directory",
        ),
        (
            "post",
            "/api/workspaces",
            {"root_path": r"C:\\work"},
            WorkspacePathInaccessibleError(),
            403,
            "workspace_path_inaccessible",
        ),
        (
            "post",
            "/api/workspaces/workspace-1/open",
            None,
            WorkspacePersistenceError(),
            500,
            "workspace_persistence_failed",
        ),
    ],
)
def test_all_domain_errors_use_t01_status_and_safe_envelope(
    method: str,
    path: str,
    body: dict[str, str] | None,
    error: WorkspaceDomainError,
    status_code: int,
    code: str,
) -> None:
    service = FakeWorkspaceService(error=error)
    client = make_client(service)

    response = getattr(client, method)(path, json=body) if body is not None else getattr(client, method)(path)

    assert response.status_code == status_code
    assert response.json()["error"]["code"] == code
    assert "root_path_key" not in response.text
    assert "SELECT" not in response.text
    assert "Traceback" not in response.text
    if code == "workspace_already_exists":
        assert response.json()["error"]["workspace_id"] == "existing-1"


def test_unknown_workspace_and_api_routes_remain_standard_404() -> None:
    service = FakeWorkspaceService(error=WorkspaceNotFoundError())
    client = make_client(service)

    workspace_response = client.post("/api/workspaces/unknown/open")
    unknown_response = client.get("/api/not-found")

    assert workspace_response.status_code == 404
    assert workspace_response.json() == {
        "error": {"code": "workspace_not_found", "message": "The workspace was not found."}
    }
    assert unknown_response.status_code == 404
    assert unknown_response.json() == {"detail": "Not Found"}


def test_logs_only_safe_operation_metadata(caplog: pytest.LogCaptureFixture) -> None:
    sensitive_root = r"C:\\users\\private\\workspace"
    service = FakeWorkspaceService(error=WorkspacePathMissingError())
    client = make_client(service)

    with caplog.at_level(logging.INFO, logger="mini_agent.api.routes.workspaces"):
        response = client.post("/api/workspaces", json={"root_path": sensitive_root})

    assert response.status_code == 422
    logs = caplog.text
    assert "workspace_operation_failed" in logs
    assert "operation=create" in logs
    assert "workspace_path_missing" in logs
    assert sensitive_root not in logs
    assert "root_path_key" not in logs


def test_success_logs_only_operation_and_workspace_id(caplog: pytest.LogCaptureFixture) -> None:
    sensitive_root = r"C:\\users\\private\\workspace"
    service = FakeWorkspaceService()
    client = make_client(service)

    with caplog.at_level(logging.INFO, logger="mini_agent.api.routes.workspaces"):
        response = client.post("/api/workspaces", json={"root_path": sensitive_root})

    assert response.status_code == 201
    logs = caplog.text
    assert "workspace_operation_succeeded" in logs
    assert "operation=create" in logs
    assert "workspace_id=workspace-1" in logs
    assert sensitive_root not in logs
    assert "root_path_key" not in logs
