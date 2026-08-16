"""Workspace 应用服务所依赖的最小可注入端口。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, runtime_checkable

from mini_agent.domain.workspaces.model import Workspace, WorkspaceAvailability


@runtime_checkable
class WorkspaceRepository(Protocol):
    """Workspace 持久化操作的最小业务端口。"""

    def create(self, workspace: Workspace) -> None:
        """持久化一个完整的新 Workspace。"""

    def list_all(self) -> list[Workspace]:
        """返回按持久化排序规则排列的全部 Workspace。"""

    def get_by_id(self, workspace_id: str) -> Workspace | None:
        """按稳定标识查找 Workspace。"""

    def get_by_root_path_key(self, root_path_key: str) -> Workspace | None:
        """按内部规范化路径比较键查找 Workspace。"""

    def rename(self, workspace_id: str, name: str, updated_at: str) -> bool:
        """仅修改显示名称与更新时间，并报告记录是否存在。"""

    def touch_opened(self, workspace_id: str, opened_at: str) -> bool:
        """用同一时间更新最近打开时间与更新时间。"""


@dataclass(frozen=True, slots=True)
class ResolvedWorkspacePath:
    """路径适配器成功解析出的真实 Root 及内部比较键。"""

    root_path: str
    root_path_key: str

    def __post_init__(self) -> None:
        if not isinstance(self.root_path, str) or not self.root_path:
            raise ValueError("Resolved root_path must be a non-empty string.")
        if not isinstance(self.root_path_key, str) or not self.root_path_key:
            raise ValueError("Resolved root_path_key must be a non-empty string.")


@runtime_checkable
class WorkspacePathResolver(Protocol):
    """路径验证、真实目标解析与可用性投影端口。"""

    def resolve(self, root_path: str) -> ResolvedWorkspacePath:
        """解析一个当前可用的 Workspace Root，失败时抛出类型化领域错误。"""

    def get_availability(self, root_path: str) -> WorkspaceAvailability:
        """投影已保存 Root 的当前文件系统可用性。"""


@runtime_checkable
class WorkspaceIdGenerator(Protocol):
    """生成可替换的 Workspace 稳定标识。"""

    def new_id(self) -> str:
        """返回新的不透明标识。"""


@runtime_checkable
class Clock(Protocol):
    """提供可替换的时钟，生产实现返回时区感知 UTC 时间。"""

    def now(self) -> datetime:
        """返回当前时间。"""
