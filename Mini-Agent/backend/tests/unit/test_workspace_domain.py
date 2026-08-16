"""Workspace 领域模型的确定性契约测试。"""

from __future__ import annotations

from dataclasses import FrozenInstanceError
from datetime import datetime, timedelta, timezone

import pytest

from mini_agent.domain.workspaces.errors import WorkspaceNameInvalidError
from mini_agent.domain.workspaces.model import (
    MAX_WORKSPACE_NAME_LENGTH,
    Workspace,
    WorkspaceAvailability,
    default_workspace_name,
    format_utc_timestamp,
    normalize_workspace_name,
)


CREATED_AT = "2026-08-16T08:00:00.000Z"
RENAMED_AT = "2026-08-16T08:01:00.123Z"
OPENED_AT = "2026-08-16T08:02:00.456Z"


def make_workspace(**changes: str) -> Workspace:
    values = {
        "id": "workspace-1",
        "name": " Mini Agent ",
        "root_path": r"C:\work\mini-agent",
        "root_path_key": r"c:\work\mini-agent",
        "created_at": CREATED_AT,
        "updated_at": CREATED_AT,
        "last_opened_at": CREATED_AT,
    }
    values.update(changes)
    return Workspace(**values)


def test_workspace_normalizes_valid_name_and_holds_only_persisted_metadata() -> None:
    workspace = make_workspace()

    assert workspace.name == "Mini Agent"
    assert tuple(workspace.__dataclass_fields__) == (
        "id",
        "name",
        "root_path",
        "root_path_key",
        "created_at",
        "updated_at",
        "last_opened_at",
    )
    assert not hasattr(workspace, "availability")


@pytest.mark.parametrize(
    "name",
    ["", "   ", "valid\nname", "valid\rname", "valid\x00name", "x" * (MAX_WORKSPACE_NAME_LENGTH + 1)],
)
def test_workspace_rejects_empty_oversized_and_control_character_names(name: str) -> None:
    with pytest.raises(WorkspaceNameInvalidError) as raised:
        make_workspace(name=name)

    assert raised.value.code == "workspace_name_invalid"
    assert raised.value.field == "name"


def test_workspace_counts_unicode_code_points_for_name_length() -> None:
    name = "界" * MAX_WORKSPACE_NAME_LENGTH

    assert normalize_workspace_name(f"  {name}  ") == name
    with pytest.raises(WorkspaceNameInvalidError):
        normalize_workspace_name(name + "界")


def test_workspace_create_uses_normalized_directory_leaf_as_default_name() -> None:
    workspace = Workspace.create(
        workspace_id="workspace-1",
        root_path=r"C:\work\mini-agent",
        root_path_key=r"c:\work\mini-agent",
        created_at=CREATED_AT,
    )

    assert default_workspace_name(r"C:\work\mini-agent") == "mini-agent"
    assert workspace.name == "mini-agent"
    assert workspace.created_at == workspace.updated_at == workspace.last_opened_at == CREATED_AT


def test_workspace_root_identity_is_immutable_and_rename_only_changes_allowed_fields() -> None:
    workspace = make_workspace()
    renamed = workspace.renamed(name=" Renamed ", updated_at=RENAMED_AT)

    with pytest.raises(FrozenInstanceError):
        workspace.root_path = r"C:\other"  # type: ignore[misc]

    assert renamed.name == "Renamed"
    assert renamed.updated_at == RENAMED_AT
    assert renamed.id == workspace.id
    assert renamed.root_path == workspace.root_path
    assert renamed.root_path_key == workspace.root_path_key
    assert renamed.created_at == workspace.created_at
    assert renamed.last_opened_at == workspace.last_opened_at


def test_workspace_open_updates_both_open_and_updated_timestamps_without_changing_identity() -> None:
    workspace = make_workspace().renamed(name="Renamed", updated_at=RENAMED_AT)
    opened = workspace.opened(opened_at=OPENED_AT)

    assert opened.updated_at == OPENED_AT
    assert opened.last_opened_at == OPENED_AT
    assert opened.id == workspace.id
    assert opened.root_path == workspace.root_path
    assert opened.root_path_key == workspace.root_path_key
    assert opened.created_at == workspace.created_at
    assert opened.name == workspace.name


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("created_at", "2026-08-16T08:00:00Z"),
        ("created_at", "2026-08-16T08:00:00.00Z"),
        ("created_at", "2026-08-16T08:00:00.000+00:00"),
        ("updated_at", "2026-08-16T07:59:59.999Z"),
        ("last_opened_at", "2026-08-16T07:59:59.999Z"),
    ],
)
def test_workspace_rejects_invalid_or_pre_creation_timestamps(field: str, value: str) -> None:
    with pytest.raises(ValueError):
        make_workspace(**{field: value})


def test_workspace_mutation_operations_reject_time_that_moves_backwards() -> None:
    workspace = make_workspace().renamed(name="Renamed", updated_at=RENAMED_AT)

    with pytest.raises(ValueError):
        workspace.renamed(name="Again", updated_at=CREATED_AT)
    with pytest.raises(ValueError):
        workspace.opened(opened_at=CREATED_AT)


def test_timestamp_formatter_converts_to_utc_and_truncates_to_fixed_milliseconds() -> None:
    timestamp = datetime(2026, 8, 16, 16, 0, 0, 999_999, tzinfo=timezone(timedelta(hours=8)))

    assert format_utc_timestamp(timestamp) == "2026-08-16T08:00:00.999Z"
    with pytest.raises(ValueError):
        format_utc_timestamp(datetime(2026, 8, 16, 8, 0, 0))


def test_availability_values_are_fixed_and_not_persisted_on_workspace() -> None:
    assert {availability.value for availability in WorkspaceAvailability} == {
        "available",
        "missing",
        "not_directory",
        "inaccessible",
    }
