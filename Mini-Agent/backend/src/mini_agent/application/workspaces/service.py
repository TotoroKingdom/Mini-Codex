"""不依赖 HTTP 或 SQLite 实现的 Workspace 应用服务。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from mini_agent.application.workspaces.ports import (
    Clock,
    WorkspaceIdGenerator,
    WorkspacePathResolver,
    WorkspaceRepository,
)
from mini_agent.domain.workspaces.errors import (
    WorkspaceAlreadyExistsError,
    WorkspaceNotFoundError,
)
from mini_agent.domain.workspaces.model import (
    Workspace,
    WorkspaceAvailability,
    format_utc_timestamp,
)


@dataclass(frozen=True, slots=True)
class WorkspaceWithAvailability:
    """供后续 API 层投影的 Workspace 实体及其当前可用性。"""

    workspace: Workspace
    availability: WorkspaceAvailability


class UuidWorkspaceIdGenerator:
    """生产环境的 UUID Workspace 标识生成器。"""

    def new_id(self) -> str:
        """生成不透明的稳定标识。"""
        return str(uuid4())


class UtcClock:
    """生产环境的 UTC 时钟。"""

    def now(self) -> datetime:
        """返回时区感知 UTC 当前时间。"""
        return datetime.now(timezone.utc)


class WorkspaceService:
    """编排 Workspace 的 Create、List、Rename 与 Open 用例。"""

    def __init__(
        self,
        repository: WorkspaceRepository,
        path_resolver: WorkspacePathResolver,
        id_generator: WorkspaceIdGenerator | None = None,
        clock: Clock | None = None,
    ) -> None:
        self._repository = repository
        self._path_resolver = path_resolver
        self._id_generator = id_generator or UuidWorkspaceIdGenerator()
        self._clock = clock or UtcClock()

    def create(self, root_path: str, name: str | None = None) -> WorkspaceWithAvailability:
        """解析可用 Root、检查重复并持久化一次成功打开的 Workspace。"""
        resolved_path = self._path_resolver.resolve(root_path)
        timestamp = self._timestamp_now()
        workspace = Workspace.create(
            workspace_id=self._id_generator.new_id(),
            root_path=resolved_path.root_path,
            root_path_key=resolved_path.root_path_key,
            created_at=timestamp,
            name=name,
        )

        existing = self._repository.get_by_root_path_key(workspace.root_path_key)
        if existing is not None:
            raise WorkspaceAlreadyExistsError(workspace_id=existing.id)

        self._repository.create(workspace)
        return WorkspaceWithAvailability(
            workspace=workspace,
            availability=WorkspaceAvailability.AVAILABLE,
        )

    def list_all(self) -> list[WorkspaceWithAvailability]:
        """读取持久集合，并独立投影每个 Root 的当前可用性。"""
        return [
            WorkspaceWithAvailability(
                workspace=workspace,
                availability=self._project_availability(workspace.root_path),
            )
            for workspace in self._repository.list_all()
        ]

    def rename(self, workspace_id: str, name: str) -> WorkspaceWithAvailability:
        """修改显示名称；Root 失效只影响响应中的可用性投影。"""
        workspace = self._get_required_workspace(workspace_id)
        renamed = workspace.renamed(name=name, updated_at=self._timestamp_now())

        if not self._repository.rename(workspace_id, renamed.name, renamed.updated_at):
            raise WorkspaceNotFoundError()

        return WorkspaceWithAvailability(
            workspace=renamed,
            availability=self._project_availability(workspace.root_path),
        )

    def open(self, workspace_id: str) -> WorkspaceWithAvailability:
        """重新验证保存的 Root，成功时才记录本次打开时间。"""
        workspace = self._get_required_workspace(workspace_id)
        self._path_resolver.resolve(workspace.root_path)
        opened = workspace.opened(opened_at=self._timestamp_now())

        if not self._repository.touch_opened(workspace_id, opened.last_opened_at):
            raise WorkspaceNotFoundError()

        return WorkspaceWithAvailability(
            workspace=opened,
            availability=WorkspaceAvailability.AVAILABLE,
        )

    def _get_required_workspace(self, workspace_id: str) -> Workspace:
        """读取指定实体，并将缺失结果转换为稳定领域错误。"""
        workspace = self._repository.get_by_id(workspace_id)
        if workspace is None:
            raise WorkspaceNotFoundError()
        return workspace

    def _timestamp_now(self) -> str:
        """将可注入时钟的结果固定为 Workspace 持久化时间格式。"""
        return format_utc_timestamp(self._clock.now())

    def _project_availability(self, root_path: str) -> WorkspaceAvailability:
        """隔离单个 Root 的检查异常，保证列表与 Rename 可继续返回。"""
        try:
            return self._path_resolver.get_availability(root_path)
        except Exception:
            # 已保存 Root 的异常检查以安全、可恢复的 Inaccessible 状态投影。
            return WorkspaceAvailability.INACCESSIBLE
