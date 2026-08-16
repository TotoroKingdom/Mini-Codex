"""Workspace Application Service 的隔离单元测试。"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

import pytest

from mini_agent.application.workspaces.ports import ResolvedWorkspacePath
from mini_agent.application.workspaces.service import WorkspaceService
from mini_agent.domain.workspaces.errors import (
    WorkspaceAlreadyExistsError,
    WorkspaceNameInvalidError,
    WorkspaceNotFoundError,
    WorkspacePathMissingError,
)
from mini_agent.domain.workspaces.model import Workspace, WorkspaceAvailability


CREATED_AT = "2026-08-16T08:00:00.000Z"
RENAMED_AT = "2026-08-16T08:01:00.000Z"
OPENED_AT = "2026-08-16T08:02:00.000Z"


def make_workspace(
    *,
    workspace_id: str = "workspace-1",
    name: str = "Workspace",
    root_path: str = r"C:\work\workspace",
    root_path_key: str = r"c:\work\workspace",
    created_at: str = CREATED_AT,
    updated_at: str | None = None,
    last_opened_at: str | None = None,
) -> Workspace:
    return Workspace(
        id=workspace_id,
        name=name,
        root_path=root_path,
        root_path_key=root_path_key,
        created_at=created_at,
        updated_at=updated_at or created_at,
        last_opened_at=last_opened_at or created_at,
    )


@dataclass
class FakeRepository:
    items: dict[str, Workspace] = field(default_factory=dict)
    create_error: Exception | None = None
    rename_result: bool = True
    touch_result: bool = True
    calls: list[str] = field(default_factory=list)

    def create(self, workspace: Workspace) -> None:
        self.calls.append("create")
        if self.create_error is not None:
            raise self.create_error
        self.items[workspace.id] = workspace

    def list_all(self) -> list[Workspace]:
        self.calls.append("list_all")
        return list(self.items.values())

    def get_by_id(self, workspace_id: str) -> Workspace | None:
        self.calls.append(f"get_by_id:{workspace_id}")
        return self.items.get(workspace_id)

    def get_by_root_path_key(self, root_path_key: str) -> Workspace | None:
        self.calls.append(f"get_by_root_path_key:{root_path_key}")
        return next(
            (workspace for workspace in self.items.values() if workspace.root_path_key == root_path_key),
            None,
        )

    def rename(self, workspace_id: str, name: str, updated_at: str) -> bool:
        self.calls.append(f"rename:{workspace_id}")
        if not self.rename_result or workspace_id not in self.items:
            return False
        self.items[workspace_id] = self.items[workspace_id].renamed(
            name=name,
            updated_at=updated_at,
        )
        return True

    def touch_opened(self, workspace_id: str, opened_at: str) -> bool:
        self.calls.append(f"touch_opened:{workspace_id}")
        if not self.touch_result or workspace_id not in self.items:
            return False
        self.items[workspace_id] = self.items[workspace_id].opened(opened_at=opened_at)
        return True


@dataclass
class FakePathResolver:
    resolved: ResolvedWorkspacePath = field(
        default_factory=lambda: ResolvedWorkspacePath(
            root_path=r"C:\work\workspace",
            root_path_key=r"c:\work\workspace",
        )
    )
    resolve_error: Exception | None = None
    availability: dict[str, WorkspaceAvailability | Exception] = field(default_factory=dict)
    resolve_calls: list[str] = field(default_factory=list)
    availability_calls: list[str] = field(default_factory=list)

    def resolve(self, root_path: str) -> ResolvedWorkspacePath:
        self.resolve_calls.append(root_path)
        if self.resolve_error is not None:
            raise self.resolve_error
        return self.resolved

    def get_availability(self, root_path: str) -> WorkspaceAvailability:
        self.availability_calls.append(root_path)
        result = self.availability.get(root_path, WorkspaceAvailability.AVAILABLE)
        if isinstance(result, Exception):
            raise result
        return result


@dataclass
class FixedIdGenerator:
    workspace_id: str = "generated-workspace"
    calls: int = 0

    def new_id(self) -> str:
        self.calls += 1
        return self.workspace_id


@dataclass
class FixedClock:
    timestamp: datetime

    def now(self) -> datetime:
        return self.timestamp


def make_service(
    repository: FakeRepository | None = None,
    resolver: FakePathResolver | None = None,
    *,
    workspace_id: str = "generated-workspace",
    timestamp: datetime = datetime(2026, 8, 16, 8, 0, tzinfo=timezone.utc),
) -> tuple[WorkspaceService, FakeRepository, FakePathResolver, FixedIdGenerator, FixedClock]:
    fake_repository = repository or FakeRepository()
    fake_resolver = resolver or FakePathResolver()
    id_generator = FixedIdGenerator(workspace_id)
    clock = FixedClock(timestamp)
    return (
        WorkspaceService(fake_repository, fake_resolver, id_generator, clock),
        fake_repository,
        fake_resolver,
        id_generator,
        clock,
    )


def test_create_resolves_path_persists_a_default_name_and_marks_workspace_available() -> None:
    resolver = FakePathResolver(
        resolved=ResolvedWorkspacePath(
            root_path=r"C:\work\mini-agent",
            root_path_key=r"c:\work\mini-agent",
        )
    )
    service, repository, _, id_generator, _ = make_service(resolver=resolver)

    result = service.create(r" C:\input\alias ")

    assert result.availability is WorkspaceAvailability.AVAILABLE
    assert result.workspace.id == "generated-workspace"
    assert result.workspace.name == "mini-agent"
    assert result.workspace.created_at == CREATED_AT
    assert result.workspace.updated_at == CREATED_AT
    assert result.workspace.last_opened_at == CREATED_AT
    assert repository.items[result.workspace.id] == result.workspace
    assert resolver.resolve_calls == [r" C:\input\alias "]
    assert repository.calls == [
        r"get_by_root_path_key:c:\work\mini-agent",
        "create",
    ]
    assert id_generator.calls == 1


def test_create_normalizes_custom_name_and_rejects_invalid_name_before_persisting() -> None:
    service, repository, _, _, _ = make_service()

    created = service.create(r"C:\work\workspace", name="  Custom Name  ")

    assert created.workspace.name == "Custom Name"
    with pytest.raises(WorkspaceNameInvalidError):
        service.create(r"C:\work\other", name=" \n ")
    assert list(repository.items) == [created.workspace.id]


def test_create_returns_existing_id_for_precheck_and_preserves_repository_constraint_error() -> None:
    existing = make_workspace()
    service, repository, _, _, _ = make_service(FakeRepository(items={existing.id: existing}))

    with pytest.raises(WorkspaceAlreadyExistsError) as prechecked:
        service.create(r"C:\work\alias")
    assert prechecked.value.workspace_id == existing.id
    assert repository.calls[-1] == r"get_by_root_path_key:c:\work\workspace"

    final_conflict = WorkspaceAlreadyExistsError(workspace_id="concurrent-workspace")
    service, _, _, _, _ = make_service(FakeRepository(create_error=final_conflict))
    with pytest.raises(WorkspaceAlreadyExistsError) as raised:
        service.create(r"C:\work\workspace")
    assert raised.value.workspace_id == "concurrent-workspace"


def test_list_projects_each_workspace_availability_without_one_failure_hiding_the_collection() -> None:
    available = make_workspace(workspace_id="available", root_path=r"C:\available")
    missing = make_workspace(
        workspace_id="missing",
        root_path=r"C:\missing",
        root_path_key=r"c:\missing",
    )
    inaccessible = make_workspace(
        workspace_id="inaccessible",
        root_path=r"C:\inaccessible",
        root_path_key=r"c:\inaccessible",
    )
    resolver = FakePathResolver(
        availability={
            missing.root_path: WorkspaceAvailability.MISSING,
            inaccessible.root_path: RuntimeError("controlled resolver failure"),
        }
    )
    service, _, _, _, _ = make_service(
        FakeRepository(items={item.id: item for item in (available, missing, inaccessible)}),
        resolver,
    )

    results = service.list_all()

    assert [(result.workspace.id, result.availability) for result in results] == [
        ("available", WorkspaceAvailability.AVAILABLE),
        ("missing", WorkspaceAvailability.MISSING),
        ("inaccessible", WorkspaceAvailability.INACCESSIBLE),
    ]
    assert resolver.availability_calls == [
        available.root_path,
        missing.root_path,
        inaccessible.root_path,
    ]


def test_rename_validates_name_updates_only_metadata_and_projects_an_unavailable_root() -> None:
    workspace = make_workspace()
    resolver = FakePathResolver(availability={workspace.root_path: WorkspaceAvailability.MISSING})
    service, repository, _, _, clock = make_service(
        FakeRepository(items={workspace.id: workspace}),
        resolver,
        timestamp=datetime(2026, 8, 16, 8, 1, tzinfo=timezone.utc),
    )

    result = service.rename(workspace.id, "  Renamed  ")

    assert result.workspace.name == "Renamed"
    assert result.workspace.updated_at == RENAMED_AT
    assert result.workspace.root_path == workspace.root_path
    assert result.workspace.root_path_key == workspace.root_path_key
    assert result.workspace.created_at == workspace.created_at
    assert result.availability is WorkspaceAvailability.MISSING
    assert resolver.resolve_calls == []
    assert repository.calls == [f"get_by_id:{workspace.id}", f"rename:{workspace.id}"]
    assert clock.now().isoformat() == "2026-08-16T08:01:00+00:00"


def test_rename_rejects_invalid_or_missing_workspaces_and_handles_a_racing_delete() -> None:
    workspace = make_workspace()
    service, repository, _, _, _ = make_service(FakeRepository(items={workspace.id: workspace}))

    with pytest.raises(WorkspaceNameInvalidError):
        service.rename(workspace.id, " ")
    assert repository.calls == [f"get_by_id:{workspace.id}"]

    service, _, resolver, _, _ = make_service()
    with pytest.raises(WorkspaceNotFoundError):
        service.rename("missing", "Name")
    assert resolver.availability_calls == []

    service, _, _, _, _ = make_service(
        FakeRepository(items={workspace.id: workspace}, rename_result=False)
    )
    with pytest.raises(WorkspaceNotFoundError):
        service.rename(workspace.id, "Name")


def test_open_revalidates_root_then_touches_both_timestamps_only_after_success() -> None:
    workspace = make_workspace()
    service, repository, resolver, _, _ = make_service(
        FakeRepository(items={workspace.id: workspace}),
        timestamp=datetime(2026, 8, 16, 8, 2, tzinfo=timezone.utc),
    )

    result = service.open(workspace.id)

    assert resolver.resolve_calls == [workspace.root_path]
    assert repository.calls == [f"get_by_id:{workspace.id}", f"touch_opened:{workspace.id}"]
    assert result.availability is WorkspaceAvailability.AVAILABLE
    assert result.workspace.updated_at == OPENED_AT
    assert result.workspace.last_opened_at == OPENED_AT
    assert result.workspace.id == workspace.id
    assert result.workspace.root_path == workspace.root_path
    assert result.workspace.root_path_key == workspace.root_path_key
    assert result.workspace.created_at == workspace.created_at


def test_open_failure_does_not_touch_timestamps_and_missing_or_racing_records_are_not_found() -> None:
    workspace = make_workspace()
    service, repository, resolver, _, _ = make_service(
        FakeRepository(items={workspace.id: workspace}),
        FakePathResolver(resolve_error=WorkspacePathMissingError()),
        timestamp=datetime(2026, 8, 16, 8, 2, tzinfo=timezone.utc),
    )

    with pytest.raises(WorkspacePathMissingError):
        service.open(workspace.id)
    assert resolver.resolve_calls == [workspace.root_path]
    assert repository.calls == [f"get_by_id:{workspace.id}"]
    assert repository.items[workspace.id] == workspace

    service, _, resolver, _, _ = make_service()
    with pytest.raises(WorkspaceNotFoundError):
        service.open("missing")
    assert resolver.resolve_calls == []

    service, _, _, _, _ = make_service(
        FakeRepository(items={workspace.id: workspace}, touch_result=False),
        timestamp=datetime(2026, 8, 16, 8, 2, tzinfo=timezone.utc),
    )
    with pytest.raises(WorkspaceNotFoundError):
        service.open(workspace.id)
