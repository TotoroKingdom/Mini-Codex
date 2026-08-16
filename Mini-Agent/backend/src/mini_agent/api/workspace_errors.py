"""将 Workspace 领域错误转换为稳定的 HTTP 错误契约。"""

from __future__ import annotations

from dataclasses import dataclass

from mini_agent.api.schemas.workspaces import WorkspaceErrorDetail, WorkspaceErrorEnvelope
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


@dataclass(frozen=True, slots=True)
class MappedWorkspaceError:
    """供路由直接序列化的安全状态码和错误信封。"""

    status_code: int
    body: WorkspaceErrorEnvelope


_ERROR_DETAILS: dict[type[WorkspaceDomainError], tuple[int, str, str, str | None]] = {
    WorkspaceNotFoundError: (404, "workspace_not_found", "The workspace was not found.", None),
    WorkspaceAlreadyExistsError: (
        409,
        "workspace_already_exists",
        "The workspace has already been added.",
        "root_path",
    ),
    WorkspaceNameInvalidError: (422, "workspace_name_invalid", "The workspace name is invalid.", "name"),
    WorkspacePathInvalidError: (422, "workspace_path_invalid", "The workspace path is invalid.", "root_path"),
    WorkspacePathMissingError: (
        422,
        "workspace_path_missing",
        "The workspace path does not exist.",
        "root_path",
    ),
    WorkspacePathNotDirectoryError: (
        422,
        "workspace_path_not_directory",
        "The workspace path is not a directory.",
        "root_path",
    ),
    WorkspacePathInaccessibleError: (
        403,
        "workspace_path_inaccessible",
        "The workspace path is inaccessible.",
        "root_path",
    ),
    WorkspacePersistenceError: (
        500,
        "workspace_persistence_failed",
        "The workspace could not be saved.",
        None,
    ),
}
_FALLBACK_ERROR = (500, "workspace_persistence_failed", "The workspace could not be saved.", None)


def map_workspace_error(error: WorkspaceDomainError) -> MappedWorkspaceError:
    """映射已知领域错误，未知子类也只返回安全持久化失败响应。"""
    status_code, code, message, field = _ERROR_DETAILS.get(type(error), _FALLBACK_ERROR)
    workspace_id = error.workspace_id if isinstance(error, WorkspaceAlreadyExistsError) else None
    return MappedWorkspaceError(
        status_code=status_code,
        body=WorkspaceErrorEnvelope(
            error=WorkspaceErrorDetail(
                code=code,
                message=message,
                field=field,
                workspace_id=workspace_id,
            )
        ),
    )
