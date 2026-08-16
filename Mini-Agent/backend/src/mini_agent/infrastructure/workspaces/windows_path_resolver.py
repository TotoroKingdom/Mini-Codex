"""Windows Workspace Root 的规范化、真实解析与可用性检查。"""

from __future__ import annotations

import errno
import ntpath
import os
import re
from pathlib import Path
from typing import Protocol

from mini_agent.application.workspaces.ports import ResolvedWorkspacePath
from mini_agent.domain.workspaces.errors import (
    WorkspacePathInaccessibleError,
    WorkspacePathInvalidError,
    WorkspacePathMissingError,
    WorkspacePathNotDirectoryError,
)
from mini_agent.domain.workspaces.model import WorkspaceAvailability


_DRIVE_ROOTED_PATH_PATTERN = re.compile(r"^[A-Za-z]:\\")


class WindowsPathOperations(Protocol):
    """隔离真实文件系统，使权限与别名场景能够确定性测试。"""

    def resolve_existing(self, path: str) -> str:
        """返回已存在路径的真实目标，缺失时抛出 OSError。"""

    def is_directory(self, path: str) -> bool:
        """判断真实目标是否为目录。"""

    def check_basic_listing(self, path: str) -> None:
        """打开并读取根目录的一个条目，验证基础列目录能力。"""


class _SystemWindowsPathOperations:
    """生产环境使用的标准库文件系统操作。"""

    def resolve_existing(self, path: str) -> str:
        return str(Path(path).resolve(strict=True))

    def is_directory(self, path: str) -> bool:
        return Path(path).is_dir()

    def check_basic_listing(self, path: str) -> None:
        # 仅触发一次根目录枚举，不递归扫描或读取任何子文件内容。
        with os.scandir(path) as entries:
            next(entries, None)


class WindowsWorkspacePathResolver:
    """将受支持的 Windows 盘符绝对路径解析为稳定 Workspace 身份。"""

    def __init__(self, operations: WindowsPathOperations | None = None) -> None:
        self._operations = operations or _SystemWindowsPathOperations()

    def resolve(self, root_path: str) -> ResolvedWorkspacePath:
        """解析并验证当前可作为 Workspace 的可访问目录。"""
        normalized_input = self._normalize_supported_path(root_path)
        resolved_path = self._resolve_existing(normalized_input)
        normalized_resolved_path = self._normalize_supported_path(resolved_path)

        if not self._is_directory(normalized_resolved_path):
            raise WorkspacePathNotDirectoryError()
        self._check_basic_listing(normalized_resolved_path)

        return ResolvedWorkspacePath(
            root_path=normalized_resolved_path,
            root_path_key=self._build_root_path_key(normalized_resolved_path),
        )

    def get_availability(self, root_path: str) -> WorkspaceAvailability:
        """以四种固定状态投影已保存 Root 的当前文件系统可用性。"""
        try:
            self.resolve(root_path)
        except WorkspacePathMissingError:
            return WorkspaceAvailability.MISSING
        except WorkspacePathNotDirectoryError:
            return WorkspaceAvailability.NOT_DIRECTORY
        except WorkspacePathInaccessibleError:
            return WorkspaceAvailability.INACCESSIBLE
        return WorkspaceAvailability.AVAILABLE

    def _normalize_supported_path(self, root_path: str) -> str:
        """拒绝不受支持的语法，并统一分隔符及点路径段。"""
        if not isinstance(root_path, str):
            raise WorkspacePathInvalidError()

        trimmed_path = root_path.strip()
        if not trimmed_path:
            raise WorkspacePathInvalidError()

        # 先拒绝 UNC、设备和扩展长度命名空间，避免后续路径 API 意外接受它们。
        if trimmed_path.startswith("\\\\"):
            raise WorkspacePathInvalidError()

        normalized_path = ntpath.normpath(trimmed_path.replace("/", "\\"))
        if not _DRIVE_ROOTED_PATH_PATTERN.fullmatch(normalized_path[:3]):
            raise WorkspacePathInvalidError()

        drive, tail = ntpath.splitdrive(normalized_path)
        if not drive or tail in {"", "\\"}:
            raise WorkspacePathInvalidError()

        # normpath 已消除合法目录的尾部分隔符；此处保留断言以固定内部表示。
        return normalized_path.rstrip("\\")

    def _resolve_existing(self, path: str) -> str:
        """将操作系统解析异常转换为安全的 Workspace 领域错误。"""
        try:
            resolved_path = self._operations.resolve_existing(path)
        except OSError as error:
            self._raise_filesystem_error(error)

        if not isinstance(resolved_path, str):
            raise WorkspacePathInvalidError()
        return resolved_path

    def _is_directory(self, path: str) -> bool:
        """在不泄漏 OS 异常的前提下验证真实目标类型。"""
        try:
            return self._operations.is_directory(path)
        except OSError as error:
            self._raise_filesystem_error(error)

    def _check_basic_listing(self, path: str) -> None:
        """验证根目录可打开并进行最小列目录操作。"""
        try:
            self._operations.check_basic_listing(path)
        except OSError as error:
            self._raise_filesystem_error(error)

    @staticmethod
    def _build_root_path_key(root_path: str) -> str:
        """构造不含尾分隔符且按 Windows 大小写规则比较的内部键。"""
        normalized_path = ntpath.normpath(root_path.replace("/", "\\")).rstrip("\\")
        return normalized_path.casefold()

    @staticmethod
    def _raise_filesystem_error(error: OSError) -> None:
        """按照安全领域分类封装所有可能的文件系统异常。"""
        if isinstance(error, FileNotFoundError) or error.errno == errno.ENOENT:
            raise WorkspacePathMissingError() from None
        if isinstance(error, NotADirectoryError) or error.errno == errno.ENOTDIR:
            raise WorkspacePathNotDirectoryError() from None
        if isinstance(error, PermissionError) or error.errno in {errno.EACCES, errno.EPERM}:
            raise WorkspacePathInaccessibleError() from None
        raise WorkspacePathInvalidError() from None
