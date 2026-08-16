"""Windows Workspace 路径解析器的隔离单元测试。"""

from __future__ import annotations

import errno
from dataclasses import dataclass, field
from pathlib import Path

import pytest

from mini_agent.domain.workspaces.errors import (
    WorkspacePathInaccessibleError,
    WorkspacePathInvalidError,
    WorkspacePathMissingError,
    WorkspacePathNotDirectoryError,
)
from mini_agent.domain.workspaces.model import WorkspaceAvailability
from mini_agent.infrastructure.workspaces.windows_path_resolver import WindowsWorkspacePathResolver


@dataclass
class FakeWindowsPathOperations:
    """可配置的文件系统替身，不依赖管理员权限或固定目录。"""

    resolved_paths: dict[str, str | OSError] = field(default_factory=dict)
    directories: dict[str, bool | OSError] = field(default_factory=dict)
    listing_results: dict[str, OSError | None] = field(default_factory=dict)
    resolve_calls: list[str] = field(default_factory=list)
    directory_calls: list[str] = field(default_factory=list)
    listing_calls: list[str] = field(default_factory=list)

    def resolve_existing(self, path: str) -> str:
        self.resolve_calls.append(path)
        result = self.resolved_paths.get(path, path)
        if isinstance(result, OSError):
            raise result
        return result

    def is_directory(self, path: str) -> bool:
        self.directory_calls.append(path)
        result = self.directories.get(path, True)
        if isinstance(result, OSError):
            raise result
        return result

    def check_basic_listing(self, path: str) -> None:
        self.listing_calls.append(path)
        result = self.listing_results.get(path)
        if result is not None:
            raise result


def test_resolver_accepts_a_real_temporary_drive_rooted_directory(tmp_path: Path) -> None:
    resolver = WindowsWorkspacePathResolver()

    resolved = resolver.resolve(str(tmp_path))

    assert resolved.root_path.endswith(tmp_path.name)
    assert resolved.root_path_key == resolved.root_path.replace("/", "\\").casefold()
    assert resolver.get_availability(str(tmp_path)) is WorkspaceAvailability.AVAILABLE


def test_resolver_trims_normalizes_separators_and_dot_segments_before_real_resolution() -> None:
    operations = FakeWindowsPathOperations(
        resolved_paths={r"C:\Work\Project": r"C:\Target\Project"},
    )
    resolver = WindowsWorkspacePathResolver(operations)

    resolved = resolver.resolve(r"  C:/Work/Project/./src/..\\  ")

    assert operations.resolve_calls == [r"C:\Work\Project"]
    assert resolved.root_path == r"C:\Target\Project"
    assert resolved.root_path_key == r"c:\target\project"


def test_resolver_maps_junction_or_symlink_aliases_to_the_same_final_identity_key() -> None:
    operations = FakeWindowsPathOperations(
        resolved_paths={
            r"C:\Alias": r"C:\Target\Project",
            r"C:\target\project": r"C:\TARGET\PROJECT",
        }
    )
    resolver = WindowsWorkspacePathResolver(operations)

    alias = resolver.resolve(r"C:\Alias")
    direct = resolver.resolve(r"C:/target/project")

    assert alias.root_path == r"C:\Target\Project"
    assert alias.root_path_key == direct.root_path_key == r"c:\target\project"


def test_resolver_does_not_expand_environment_or_home_syntax() -> None:
    operations = FakeWindowsPathOperations()
    resolver = WindowsWorkspacePathResolver(operations)

    resolved = resolver.resolve(r" C:\%USERPROFILE%\~project ")

    assert operations.resolve_calls == [r"C:\%USERPROFILE%\~project"]
    assert resolved.root_path == r"C:\%USERPROFILE%\~project"


@pytest.mark.parametrize(
    "root_path",
    [
        "",
        "   ",
        r"project\relative",
        r"C:project",
        "C:\\",
        r"C:/",
        r"\\server\share\project",
        r"\\?\C:\project",
        r"\\.\C:\project",
    ],
)
def test_resolver_rejects_unsupported_and_non_absolute_path_forms_before_filesystem_access(
    root_path: str,
) -> None:
    operations = FakeWindowsPathOperations()
    resolver = WindowsWorkspacePathResolver(operations)

    with pytest.raises(WorkspacePathInvalidError) as raised:
        resolver.resolve(root_path)

    assert raised.value.code == "workspace_path_invalid"
    assert operations.resolve_calls == []


def test_resolver_revalidates_a_resolved_target_and_rejects_unsupported_namespace_aliases() -> None:
    operations = FakeWindowsPathOperations(
        resolved_paths={r"C:\Alias": r"\\server\share\project"},
    )
    resolver = WindowsWorkspacePathResolver(operations)

    with pytest.raises(WorkspacePathInvalidError):
        resolver.resolve(r"C:\Alias")

    assert operations.directory_calls == []
    assert operations.listing_calls == []


@pytest.mark.parametrize(
    ("operations", "exception_type", "expected_code"),
    [
        (
            FakeWindowsPathOperations(
                resolved_paths={r"C:\Missing": FileNotFoundError(r"C:\private\missing")}
            ),
            WorkspacePathMissingError,
            "workspace_path_missing",
        ),
        (
            FakeWindowsPathOperations(directories={r"C:\File": False}),
            WorkspacePathNotDirectoryError,
            "workspace_path_not_directory",
        ),
        (
            FakeWindowsPathOperations(
                listing_results={r"C:\Private": PermissionError(r"C:\private\secret")}
            ),
            WorkspacePathInaccessibleError,
            "workspace_path_inaccessible",
        ),
        (
            FakeWindowsPathOperations(
                resolved_paths={r"C:\Invalid": OSError(errno.EINVAL, "raw operating system detail")}
            ),
            WorkspacePathInvalidError,
            "workspace_path_invalid",
        ),
    ],
)
def test_resolver_maps_filesystem_failures_to_safe_typed_domain_errors(
    operations: FakeWindowsPathOperations,
    exception_type: type[Exception],
    expected_code: str,
) -> None:
    resolver = WindowsWorkspacePathResolver(operations)
    path = next(iter(operations.resolved_paths or operations.directories or operations.listing_results))

    with pytest.raises(exception_type) as raised:
        resolver.resolve(path)

    assert raised.value.code == expected_code  # type: ignore[attr-defined]
    assert "private" not in str(raised.value).lower()
    assert "raw operating system detail" not in str(raised.value).lower()


@pytest.mark.parametrize(
    ("path", "operations", "expected"),
    [
        (r"C:\Available", FakeWindowsPathOperations(), WorkspaceAvailability.AVAILABLE),
        (
            r"C:\Missing",
            FakeWindowsPathOperations(resolved_paths={r"C:\Missing": FileNotFoundError()}),
            WorkspaceAvailability.MISSING,
        ),
        (
            r"C:\File",
            FakeWindowsPathOperations(directories={r"C:\File": False}),
            WorkspaceAvailability.NOT_DIRECTORY,
        ),
        (
            r"C:\Private",
            FakeWindowsPathOperations(listing_results={r"C:\Private": PermissionError()}),
            WorkspaceAvailability.INACCESSIBLE,
        ),
    ],
)
def test_resolver_projects_all_four_availability_states(
    path: str,
    operations: FakeWindowsPathOperations,
    expected: WorkspaceAvailability,
) -> None:
    assert WindowsWorkspacePathResolver(operations).get_availability(path) is expected


def test_resolver_uses_one_non_recursive_basic_listing_check_after_directory_validation() -> None:
    operations = FakeWindowsPathOperations()
    resolver = WindowsWorkspacePathResolver(operations)

    resolver.resolve(r"C:\Project")

    assert operations.directory_calls == [r"C:\Project"]
    assert operations.listing_calls == [r"C:\Project"]
