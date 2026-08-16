"""Workspace 领域实体、值对象和时间约束。"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from enum import StrEnum
from pathlib import PureWindowsPath

from mini_agent.domain.workspaces.errors import WorkspaceNameInvalidError


MAX_WORKSPACE_NAME_LENGTH = 80
UTC_TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"
_UTC_MILLISECOND_TIMESTAMP_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$"
)


class WorkspaceAvailability(StrEnum):
    """当前文件系统投影的可用性；它不属于持久化实体字段。"""

    AVAILABLE = "available"
    MISSING = "missing"
    NOT_DIRECTORY = "not_directory"
    INACCESSIBLE = "inaccessible"


def format_utc_timestamp(timestamp: datetime) -> str:
    """将时区感知的时间统一序列化为固定三位毫秒 UTC 格式。"""
    if not isinstance(timestamp, datetime):
        raise TypeError("Workspace timestamps must be datetimes.")
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        raise ValueError("Workspace timestamps must be timezone-aware UTC datetimes.")

    utc_timestamp = timestamp.astimezone(timezone.utc)
    milliseconds = utc_timestamp.microsecond // 1_000
    return utc_timestamp.strftime("%Y-%m-%dT%H:%M:%S") + f".{milliseconds:03d}Z"


def validate_utc_timestamp(value: str) -> str:
    """验证并返回固定毫秒 UTC 时间字符串。"""
    if not isinstance(value, str) or not _UTC_MILLISECOND_TIMESTAMP_PATTERN.fullmatch(value):
        raise ValueError("Workspace timestamps must use fixed millisecond UTC ISO 8601 format.")

    try:
        datetime.strptime(value, UTC_TIMESTAMP_FORMAT)
    except ValueError as error:
        raise ValueError("Workspace timestamps must be valid UTC ISO 8601 timestamps.") from error
    return value


def normalize_workspace_name(value: str) -> str:
    """去除显示名称首尾空白，并执行长度与控制字符约束。"""
    if not isinstance(value, str):
        raise WorkspaceNameInvalidError()

    normalized = value.strip()
    if not normalized or len(normalized) > MAX_WORKSPACE_NAME_LENGTH:
        raise WorkspaceNameInvalidError()
    if any(ord(character) <= 0x1F for character in normalized):
        raise WorkspaceNameInvalidError()
    return normalized


def default_workspace_name(root_path: str) -> str:
    """从已规范化的 Windows 目录路径推导默认显示名称。"""
    if not isinstance(root_path, str) or not root_path:
        raise ValueError("Workspace root_path must be a non-empty string.")

    name = PureWindowsPath(root_path).name
    if not name:
        raise WorkspaceNameInvalidError()
    return normalize_workspace_name(name)


@dataclass(frozen=True, slots=True)
class Workspace:
    """已验证、持久化的 Workspace 元数据。"""

    id: str
    name: str
    root_path: str
    root_path_key: str
    created_at: str
    updated_at: str
    last_opened_at: str

    def __post_init__(self) -> None:
        if not isinstance(self.id, str) or not self.id:
            raise ValueError("Workspace id must be a non-empty string.")
        if not isinstance(self.root_path, str) or not self.root_path:
            raise ValueError("Workspace root_path must be a non-empty string.")
        if not isinstance(self.root_path_key, str) or not self.root_path_key:
            raise ValueError("Workspace root_path_key must be a non-empty string.")

        object.__setattr__(self, "name", normalize_workspace_name(self.name))
        created_at = validate_utc_timestamp(self.created_at)
        updated_at = validate_utc_timestamp(self.updated_at)
        last_opened_at = validate_utc_timestamp(self.last_opened_at)
        if updated_at < created_at or last_opened_at < created_at:
            raise ValueError("Workspace timestamps cannot precede creation.")

    @classmethod
    def create(
        cls,
        *,
        workspace_id: str,
        root_path: str,
        root_path_key: str,
        created_at: str,
        name: str | None = None,
    ) -> Workspace:
        """创建一个同时视为已成功打开的 Workspace。"""
        return cls(
            id=workspace_id,
            name=default_workspace_name(root_path) if name is None else name,
            root_path=root_path,
            root_path_key=root_path_key,
            created_at=created_at,
            updated_at=created_at,
            last_opened_at=created_at,
        )

    def renamed(self, *, name: str, updated_at: str) -> Workspace:
        """返回只更新显示名称和更新时间的新实体。"""
        normalized_updated_at = validate_utc_timestamp(updated_at)
        if normalized_updated_at < self.updated_at:
            raise ValueError("Workspace updated_at cannot move backwards.")
        return replace(self, name=name, updated_at=normalized_updated_at)

    def opened(self, *, opened_at: str) -> Workspace:
        """返回一次成功打开后的新实体，Root 身份保持不变。"""
        normalized_opened_at = validate_utc_timestamp(opened_at)
        if normalized_opened_at < self.updated_at or normalized_opened_at < self.last_opened_at:
            raise ValueError("Workspace opened_at cannot move backwards.")
        return replace(
            self,
            updated_at=normalized_opened_at,
            last_opened_at=normalized_opened_at,
        )
