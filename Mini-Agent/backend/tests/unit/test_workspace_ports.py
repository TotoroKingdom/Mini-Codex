"""Workspace 应用端口的最小公开契约测试。"""

from __future__ import annotations

import inspect
from datetime import datetime, timezone

import pytest

from mini_agent.application.workspaces.ports import (
    Clock,
    ResolvedWorkspacePath,
    WorkspaceIdGenerator,
    WorkspacePathResolver,
    WorkspaceRepository,
)
from mini_agent.domain.workspaces.model import WorkspaceAvailability


def test_repository_port_exposes_only_workspace_use_case_operations() -> None:
    public_operations = {
        name
        for name, member in inspect.getmembers(WorkspaceRepository, predicate=inspect.isfunction)
        if not name.startswith("_")
    }

    assert public_operations == {
        "create",
        "list_all",
        "get_by_id",
        "get_by_root_path_key",
        "rename",
        "touch_opened",
    }


def test_path_resolver_id_generator_and_clock_are_small_injectable_protocols() -> None:
    resolver_operations = {
        name
        for name, member in inspect.getmembers(WorkspacePathResolver, predicate=inspect.isfunction)
        if not name.startswith("_")
    }
    id_operations = {
        name
        for name, member in inspect.getmembers(WorkspaceIdGenerator, predicate=inspect.isfunction)
        if not name.startswith("_")
    }
    clock_operations = {
        name
        for name, member in inspect.getmembers(Clock, predicate=inspect.isfunction)
        if not name.startswith("_")
    }

    assert resolver_operations == {"resolve", "get_availability"}
    assert id_operations == {"new_id"}
    assert clock_operations == {"now"}


def test_resolved_workspace_path_requires_both_non_empty_internal_values() -> None:
    resolved = ResolvedWorkspacePath(
        root_path=r"C:\work\mini-agent",
        root_path_key=r"c:\work\mini-agent",
    )

    assert resolved.root_path == r"C:\work\mini-agent"
    assert resolved.root_path_key == r"c:\work\mini-agent"
    with pytest.raises(ValueError):
        ResolvedWorkspacePath(root_path="", root_path_key="key")
    with pytest.raises(ValueError):
        ResolvedWorkspacePath(root_path="path", root_path_key="")


class FakeRepository:
    def create(self, _workspace: object) -> None:
        pass

    def list_all(self) -> list[object]:
        return []

    def get_by_id(self, _workspace_id: str) -> None:
        return None

    def get_by_root_path_key(self, _root_path_key: str) -> None:
        return None

    def rename(self, _workspace_id: str, _name: str, _updated_at: str) -> bool:
        return False

    def touch_opened(self, _workspace_id: str, _opened_at: str) -> bool:
        return False


class FakeResolver:
    def resolve(self, _root_path: str) -> ResolvedWorkspacePath:
        return ResolvedWorkspacePath(root_path=r"C:\work", root_path_key=r"c:\work")

    def get_availability(self, _root_path: str) -> WorkspaceAvailability:
        return WorkspaceAvailability.AVAILABLE


class FakeIdGenerator:
    def new_id(self) -> str:
        return "workspace-1"


class FakeClock:
    def now(self) -> datetime:
        return datetime(2026, 8, 16, 8, 0, tzinfo=timezone.utc)


def test_protocols_accept_complete_test_doubles_without_framework_dependencies() -> None:
    assert isinstance(FakeRepository(), WorkspaceRepository)
    assert isinstance(FakeResolver(), WorkspacePathResolver)
    assert isinstance(FakeIdGenerator(), WorkspaceIdGenerator)
    assert isinstance(FakeClock(), Clock)
