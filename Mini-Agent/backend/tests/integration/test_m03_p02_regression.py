"""M03 P02 公共 API、CORS、隐私与持久化边界的累计回归测试。"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from mini_agent.api.app import create_app
from mini_agent.api.routes.workspaces import get_workspace_service
from mini_agent.config import Settings
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


ALLOWED_ORIGIN = "http://localhost:5173"


def make_settings(data_dir: Path) -> Settings:
    return Settings(
        environment="test",
        data_dir=data_dir,
        cors_origins=(ALLOWED_ORIGIN,),
        _env_file=None,
    )


def test_real_p02_stack_keeps_api_cors_schema_and_route_boundaries(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    root = tmp_path / "workspace-root"
    root.mkdir()
    app = create_app(make_settings(data_dir))

    workspace_operations = {
        (path, method.upper())
        for path, operations in app.openapi()["paths"].items()
        if path.startswith("/api/workspaces")
        for method in operations
    }
    assert workspace_operations == {
        ("/api/workspaces", "GET"),
        ("/api/workspaces", "POST"),
        ("/api/workspaces/{workspace_id}", "PATCH"),
        ("/api/workspaces/{workspace_id}/open", "POST"),
    }
    assert not data_dir.exists()

    with TestClient(app) as client:
        health = client.get("/api/health")
        preflight = client.options(
            "/api/workspaces",
            headers={
                "Origin": ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        created = client.post(
            "/api/workspaces",
            json={"root_path": str(root), "name": "P02 Workspace"},
        )
        workspace_id = created.json()["id"]
        duplicate = client.post(
            "/api/workspaces",
            json={"root_path": f"{root.parent}\\{root.name}\\..\\{root.name}"},
        )
        listed = client.get("/api/workspaces")
        renamed = client.patch(
            f"/api/workspaces/{workspace_id}",
            json={"name": "P02 Renamed"},
        )
        opened = client.post(f"/api/workspaces/{workspace_id}/open")
        root_update = client.patch(
            f"/api/workspaces/{workspace_id}",
            json={"name": "P02 Renamed", "root_path": str(tmp_path / "other")},
        )
        unknown_route = client.get("/api/not-found")

        with app.state.database.read_connection() as connection:
            tables = [
                row["name"]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
                )
            ]
            columns = connection.execute("PRAGMA table_info(workspaces)").fetchall()
            workspace_count = connection.execute("SELECT COUNT(*) FROM workspaces").fetchone()[0]

    assert health.json() == {
        "status": "ok",
        "service": "mini-agent-backend",
        "api_version": "v1",
        "database": {"status": "ready", "schema_version": 2},
    }
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "PATCH" in preflight.headers["access-control-allow-methods"]
    assert "content-type" in preflight.headers["access-control-allow-headers"].lower()
    assert "access-control-allow-credentials" not in preflight.headers
    assert created.status_code == 201
    assert set(created.json()) == {
        "id",
        "name",
        "root_path",
        "availability",
        "created_at",
        "updated_at",
        "last_opened_at",
    }
    assert created.json()["availability"] == "available"
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["workspace_id"] == workspace_id
    assert listed.json()["items"][0]["id"] == workspace_id
    assert renamed.status_code == opened.status_code == 200
    assert renamed.json()["root_path"] == opened.json()["root_path"] == created.json()["root_path"]
    assert opened.json()["availability"] == "available"
    assert root_update.status_code == 422
    assert unknown_route.status_code == 404
    assert "root_path_key" not in created.text + listed.text + renamed.text + opened.text
    assert tables == ["schema_versions", "workspaces"]
    assert [column["name"] for column in columns] == [
        "id",
        "name",
        "root_path",
        "root_path_key",
        "created_at",
        "updated_at",
        "last_opened_at",
    ]
    assert workspace_count == 1
    assert root.is_dir()


@dataclass
class RaisingWorkspaceService:
    """验证 HTTP 映射时使用的隔离领域错误服务。"""

    error: WorkspaceDomainError

    def create(self, _root_path: str, _name: str | None = None) -> object:
        raise self.error

    def list_all(self) -> list[object]:
        raise self.error

    def rename(self, _workspace_id: str, _name: str) -> object:
        raise self.error

    def open(self, _workspace_id: str) -> object:
        raise self.error


@pytest.mark.parametrize(
    ("error", "method", "path", "body", "status_code", "code"),
    [
        (WorkspaceNotFoundError(), "post", "/api/workspaces/unknown/open", None, 404, "workspace_not_found"),
        (
            WorkspaceAlreadyExistsError(workspace_id="existing-1"),
            "post",
            "/api/workspaces",
            {"root_path": r"C:\\workspace"},
            409,
            "workspace_already_exists",
        ),
        (
            WorkspaceNameInvalidError(),
            "patch",
            "/api/workspaces/workspace-1",
            {"name": "Invalid"},
            422,
            "workspace_name_invalid",
        ),
        (
            WorkspacePathInvalidError(),
            "post",
            "/api/workspaces",
            {"root_path": r"C:\\workspace"},
            422,
            "workspace_path_invalid",
        ),
        (
            WorkspacePathMissingError(),
            "post",
            "/api/workspaces",
            {"root_path": r"C:\\workspace"},
            422,
            "workspace_path_missing",
        ),
        (
            WorkspacePathNotDirectoryError(),
            "post",
            "/api/workspaces",
            {"root_path": r"C:\\workspace"},
            422,
            "workspace_path_not_directory",
        ),
        (
            WorkspacePathInaccessibleError(),
            "post",
            "/api/workspaces",
            {"root_path": r"C:\\workspace"},
            403,
            "workspace_path_inaccessible",
        ),
        (
            WorkspacePersistenceError(),
            "get",
            "/api/workspaces",
            None,
            500,
            "workspace_persistence_failed",
        ),
    ],
)
def test_p02_domain_error_mapping_stays_safe_through_full_lifespan(
    tmp_path: Path,
    error: WorkspaceDomainError,
    method: str,
    path: str,
    body: dict[str, str] | None,
    status_code: int,
    code: str,
) -> None:
    app = create_app(make_settings(tmp_path / "data"))
    app.dependency_overrides[get_workspace_service] = lambda: RaisingWorkspaceService(error)

    with TestClient(app) as client:
        response = getattr(client, method)(path, json=body) if body is not None else getattr(client, method)(path)

    assert response.status_code == status_code
    assert response.json()["error"]["code"] == code
    assert "root_path_key" not in response.text
    assert "SELECT" not in response.text
    assert "Traceback" not in response.text
    if code == "workspace_already_exists":
        assert response.json()["error"]["workspace_id"] == "existing-1"
