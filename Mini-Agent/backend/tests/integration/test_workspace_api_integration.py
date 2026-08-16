"""真实 FastAPI、SQLite 与隔离临时目录的 Workspace API 集成测试。"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient
from httpx import Response

from mini_agent.api.app import create_app
from mini_agent.config import Settings


class SequenceClock:
    """为真实 Repository/Resolver 集成提供确定性 UTC 时间。"""

    def __init__(self, *timestamps: datetime) -> None:
        self._timestamps = iter(timestamps)

    def now(self) -> datetime:
        return next(self._timestamps)


def make_settings(data_dir: Path) -> Settings:
    return Settings(
        environment="test",
        data_dir=data_dir,
        cors_origins=("http://localhost:5173",),
        _env_file=None,
    )


def timestamp(hour: int) -> datetime:
    return datetime(2026, 8, 16, hour, tzinfo=timezone.utc)


def response_item(response: Response) -> dict[str, object]:
    return response.json()


def test_real_api_persists_create_list_rename_open_and_stable_sort(tmp_path: Path) -> None:
    default_root = tmp_path / "default-root"
    custom_root = tmp_path / "custom-root"
    default_root.mkdir()
    custom_root.mkdir()
    app = create_app(make_settings(tmp_path / "data"))

    with TestClient(app) as client:
        assert client.get("/api/workspaces").json() == {"items": []}
        app.state.workspace_service._clock = SequenceClock(
            timestamp(8),
            timestamp(9),
            timestamp(10),
            timestamp(11),
        )
        default_created = client.post("/api/workspaces", json={"root_path": str(default_root)})
        custom_created = client.post(
            "/api/workspaces",
            json={"root_path": str(custom_root), "name": "Custom Workspace"},
        )
        listed_after_create = client.get("/api/workspaces")

        default_item = response_item(default_created)
        custom_item = response_item(custom_created)
        assert default_created.status_code == custom_created.status_code == 201
        assert default_item["name"] == "default-root"
        assert custom_item["name"] == "Custom Workspace"
        assert default_item["availability"] == custom_item["availability"] == "available"
        assert listed_after_create.json() == {"items": [custom_item, default_item]}

        renamed = client.patch(
            f"/api/workspaces/{default_item['id']}",
            json={"name": "Renamed Workspace"},
        )
        opened = client.post(f"/api/workspaces/{default_item['id']}/open")
        listed_after_open = client.get("/api/workspaces")

        renamed_item = response_item(renamed)
        opened_item = response_item(opened)
        assert renamed.status_code == opened.status_code == 200
        assert renamed_item["root_path"] == default_item["root_path"]
        assert renamed_item["created_at"] == default_item["created_at"]
        assert renamed_item["last_opened_at"] == default_item["last_opened_at"]
        assert renamed_item["updated_at"] == "2026-08-16T10:00:00.000Z"
        assert opened_item["root_path"] == default_item["root_path"]
        assert opened_item["last_opened_at"] == opened_item["updated_at"] == "2026-08-16T11:00:00.000Z"
        assert listed_after_open.json() == {"items": [opened_item, custom_item]}

        with app.state.database.read_connection() as connection:
            rows = connection.execute(
                "SELECT id, root_path, root_path_key FROM workspaces ORDER BY id"
            ).fetchall()

    assert default_root.is_dir()
    assert custom_root.is_dir()
    assert len(rows) == 2
    assert {row["id"] for row in rows} == {default_item["id"], custom_item["id"]}
    assert {row["id"]: row["root_path"] for row in rows} == {
        default_item["id"]: default_item["root_path"],
        custom_item["id"]: custom_item["root_path"],
    }
    assert all(row["root_path_key"] for row in rows)


def test_real_api_rejects_path_alias_duplicates_without_creating_extra_row(tmp_path: Path) -> None:
    root = tmp_path / "alias-root"
    root.mkdir()
    app = create_app(make_settings(tmp_path / "data"))
    canonical_path = str(root)
    aliases = (
        canonical_path.replace("\\", "/"),
        f"{root.parent}\\{root.name}\\..\\{root.name}",
        canonical_path.upper(),
    )

    with TestClient(app) as client:
        created = client.post("/api/workspaces", json={"root_path": canonical_path})

        assert created.status_code == 201
        created_id = created.json()["id"]
        for alias in aliases:
            duplicate = client.post("/api/workspaces", json={"root_path": alias})

            assert duplicate.status_code == 409
            assert duplicate.json() == {
                "error": {
                    "code": "workspace_already_exists",
                    "message": "The workspace has already been added.",
                    "field": "root_path",
                    "workspace_id": created_id,
                }
            }

        with app.state.database.read_connection() as connection:
            count = connection.execute("SELECT COUNT(*) FROM workspaces").fetchone()[0]

    assert count == 1


def test_missing_workspace_open_does_not_touch_timestamps_and_recovers_after_restore(
    tmp_path: Path,
) -> None:
    root = tmp_path / "restorable-root"
    moved_root = tmp_path / "moved-root"
    root.mkdir()
    app = create_app(make_settings(tmp_path / "data"))

    with TestClient(app) as client:
        app.state.workspace_service._clock = SequenceClock(timestamp(8), timestamp(9))
        created = client.post("/api/workspaces", json={"root_path": str(root)})
        workspace_id = created.json()["id"]
        created_item = created.json()

        root.rename(moved_root)
        missing_list = client.get("/api/workspaces")
        failed_open = client.post(f"/api/workspaces/{workspace_id}/open")
        list_after_failed_open = client.get("/api/workspaces")

        assert missing_list.json()["items"][0]["availability"] == "missing"
        assert failed_open.status_code == 422
        assert failed_open.json()["error"]["code"] == "workspace_path_missing"
        assert list_after_failed_open.json()["items"][0]["last_opened_at"] == created_item["last_opened_at"]
        assert list_after_failed_open.json()["items"][0]["updated_at"] == created_item["updated_at"]

        moved_root.rename(root)
        reopened = client.post(f"/api/workspaces/{workspace_id}/open")

    assert reopened.status_code == 200
    assert reopened.json()["availability"] == "available"
    assert reopened.json()["last_opened_at"] == reopened.json()["updated_at"] == "2026-08-16T09:00:00.000Z"
    assert root.is_dir()


def test_list_projects_not_directory_and_inaccessible_items_without_failing_collection(
    tmp_path: Path,
) -> None:
    available_root = tmp_path / "available-root"
    file_root = tmp_path / "file-root"
    inaccessible_root = tmp_path / "inaccessible-root"
    for root in (available_root, file_root, inaccessible_root):
        root.mkdir()
    app = create_app(make_settings(tmp_path / "data"))

    with TestClient(app) as client:
        created = [
            client.post("/api/workspaces", json={"root_path": str(root)})
            for root in (available_root, file_root, inaccessible_root)
        ]
        assert all(response.status_code == 201 for response in created)
        inaccessible_id = created[2].json()["id"]

        file_root.rmdir()
        file_root.write_text("isolated fixture", encoding="utf-8")

        class SelectivePathOperations:
            """在不使用真实权限的前提下模拟单项目录不可访问。"""

            def resolve_existing(self, path: str) -> str:
                return path

            def is_directory(self, path: str) -> bool:
                return path != str(file_root)

            def check_basic_listing(self, path: str) -> None:
                if path == str(inaccessible_root):
                    raise PermissionError("isolated inaccessible fixture")

        app.state.workspace_service._path_resolver._operations = SelectivePathOperations()
        listed = client.get("/api/workspaces")
        inaccessible_open = client.post(f"/api/workspaces/{inaccessible_id}/open")

    items_by_root = {item["root_path"]: item for item in listed.json()["items"]}
    assert listed.status_code == 200
    assert items_by_root[str(available_root)]["availability"] == "available"
    assert items_by_root[str(file_root)]["availability"] == "not_directory"
    assert items_by_root[str(inaccessible_root)]["availability"] == "inaccessible"
    assert inaccessible_open.status_code == 403
    assert inaccessible_open.json()["error"]["code"] == "workspace_path_inaccessible"


def test_real_api_rejects_invalid_rename_and_unknown_workspace_id(tmp_path: Path) -> None:
    root = tmp_path / "rename-root"
    root.mkdir()
    app = create_app(make_settings(tmp_path / "data"))

    with TestClient(app) as client:
        created = client.post("/api/workspaces", json={"root_path": str(root)})
        workspace_id = created.json()["id"]
        invalid = client.patch(f"/api/workspaces/{workspace_id}", json={"name": "   "})
        unknown = client.patch("/api/workspaces/unknown", json={"name": "Renamed"})
        unknown_open = client.post("/api/workspaces/unknown/open")

    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "workspace_name_invalid"
    assert unknown.status_code == 404
    assert unknown.json()["error"]["code"] == "workspace_not_found"
    assert unknown_open.status_code == 404
    assert unknown_open.json()["error"]["code"] == "workspace_not_found"
