"""Workspace REST API 的严格请求和响应模式。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from mini_agent.application.workspaces.service import WorkspaceWithAvailability


UTC_MILLISECOND_TIMESTAMP_PATTERN = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$"
WorkspaceAvailabilityValue = Literal[
    "available",
    "missing",
    "not_directory",
    "inaccessible",
]
WorkspaceErrorCode = Literal[
    "workspace_not_found",
    "workspace_already_exists",
    "workspace_name_invalid",
    "workspace_path_invalid",
    "workspace_path_missing",
    "workspace_path_not_directory",
    "workspace_path_inaccessible",
    "workspace_persistence_failed",
]


class _StrictWorkspaceSchema(BaseModel):
    """禁止未知字段，确保公开契约不会隐式扩张。"""

    model_config = ConfigDict(extra="forbid", strict=True)


class CreateWorkspaceRequest(_StrictWorkspaceSchema):
    """创建 Workspace 的 JSON 请求。"""

    root_path: str
    name: str | None = None


class RenameWorkspaceRequest(_StrictWorkspaceSchema):
    """重命名 Workspace 的 JSON 请求。"""

    name: str


class WorkspaceResponse(_StrictWorkspaceSchema):
    """不包含内部路径比较键的公开 Workspace 表示。"""

    id: str
    name: str
    root_path: str
    availability: WorkspaceAvailabilityValue
    created_at: str = Field(pattern=UTC_MILLISECOND_TIMESTAMP_PATTERN)
    updated_at: str = Field(pattern=UTC_MILLISECOND_TIMESTAMP_PATTERN)
    last_opened_at: str = Field(pattern=UTC_MILLISECOND_TIMESTAMP_PATTERN)

    @classmethod
    def from_result(cls, result: WorkspaceWithAvailability) -> WorkspaceResponse:
        """只挑选公开字段，避免内部实体字段进入 HTTP 响应。"""
        workspace = result.workspace
        return cls(
            id=workspace.id,
            name=workspace.name,
            root_path=workspace.root_path,
            availability=result.availability.value,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            last_opened_at=workspace.last_opened_at,
        )


class WorkspaceListResponse(_StrictWorkspaceSchema):
    """固定信封的 Workspace 列表响应。"""

    items: list[WorkspaceResponse]


class WorkspaceErrorDetail(_StrictWorkspaceSchema):
    """稳定、安全的 Workspace 领域错误详情。"""

    code: WorkspaceErrorCode
    message: str
    field: Literal["name", "root_path"] | None = None
    workspace_id: str | None = None


class WorkspaceErrorEnvelope(_StrictWorkspaceSchema):
    """Workspace 领域错误的固定外层信封。"""

    error: WorkspaceErrorDetail
