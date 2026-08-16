"""Workspace 领域的稳定、安全错误类型。"""

from __future__ import annotations


class WorkspaceDomainError(Exception):
    """不暴露底层实现细节的 Workspace 领域错误基类。"""

    code = "workspace_domain_error"
    message = "The workspace operation could not be completed."
    field: str | None = None

    def __init__(self, *, workspace_id: str | None = None) -> None:
        self.workspace_id = workspace_id
        super().__init__(self.message)


class WorkspaceNotFoundError(WorkspaceDomainError):
    """请求的 Workspace 不存在。"""

    code = "workspace_not_found"
    message = "The workspace was not found."


class WorkspaceAlreadyExistsError(WorkspaceDomainError):
    """规范化后的 Workspace Root 已被保存。"""

    code = "workspace_already_exists"
    message = "The workspace has already been added."
    field = "root_path"


class WorkspaceNameInvalidError(WorkspaceDomainError):
    """Workspace 显示名称不符合领域约束。"""

    code = "workspace_name_invalid"
    message = "The workspace name is invalid."
    field = "name"


class WorkspacePathInvalidError(WorkspaceDomainError):
    """Workspace 路径语法或命名空间不受支持。"""

    code = "workspace_path_invalid"
    message = "The workspace path is invalid."
    field = "root_path"


class WorkspacePathMissingError(WorkspaceDomainError):
    """Workspace 路径或其解析目标不存在。"""

    code = "workspace_path_missing"
    message = "The workspace path does not exist."
    field = "root_path"


class WorkspacePathNotDirectoryError(WorkspaceDomainError):
    """Workspace 路径存在但不是目录。"""

    code = "workspace_path_not_directory"
    message = "The workspace path is not a directory."
    field = "root_path"


class WorkspacePathInaccessibleError(WorkspaceDomainError):
    """Workspace 路径无法进行基础目录访问。"""

    code = "workspace_path_inaccessible"
    message = "The workspace path is inaccessible."
    field = "root_path"


class WorkspacePersistenceError(WorkspaceDomainError):
    """Workspace 元数据无法可靠地持久化或读取。"""

    code = "workspace_persistence_failed"
    message = "The workspace could not be saved."
