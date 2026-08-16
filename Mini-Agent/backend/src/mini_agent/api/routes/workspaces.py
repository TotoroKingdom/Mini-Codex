"""Workspace REST 路由及可替换的应用服务依赖。"""

from __future__ import annotations

import logging
from typing import Annotated, Protocol

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from mini_agent.api.schemas.workspaces import (
    CreateWorkspaceRequest,
    RenameWorkspaceRequest,
    WorkspaceListResponse,
    WorkspaceResponse,
)
from mini_agent.api.workspace_errors import map_workspace_error
from mini_agent.application.workspaces.service import WorkspaceWithAvailability
from mini_agent.domain.workspaces.errors import WorkspaceDomainError


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workspaces")


class WorkspaceServiceDependency(Protocol):
    """路由调用四个 Workspace 用例所需的最小服务接口。"""

    def create(self, root_path: str, name: str | None = None) -> WorkspaceWithAvailability: ...

    def list_all(self) -> list[WorkspaceWithAvailability]: ...

    def rename(self, workspace_id: str, name: str) -> WorkspaceWithAvailability: ...

    def open(self, workspace_id: str) -> WorkspaceWithAvailability: ...


def get_workspace_service(request: Request) -> WorkspaceServiceDependency:
    """读取 App Factory 在后续装配阶段提供的可替换服务。"""
    service = getattr(request.app.state, "workspace_service", None)
    if service is None:
        raise RuntimeError("Workspace service has not been configured.")
    return service


WorkspaceService = Annotated[WorkspaceServiceDependency, Depends(get_workspace_service)]


def _error_response(
    *,
    operation: str,
    error: WorkspaceDomainError,
    workspace_id: str | None = None,
) -> JSONResponse:
    """记录安全诊断信息，并返回集中定义的领域错误响应。"""
    mapped = map_workspace_error(error)
    logged_workspace_id = workspace_id or mapped.body.error.workspace_id
    logger.warning(
        "workspace_operation_failed operation=%s workspace_id=%s code=%s",
        operation,
        logged_workspace_id or "-",
        mapped.body.error.code,
    )
    return JSONResponse(
        status_code=mapped.status_code,
        content=mapped.body.model_dump(mode="json", exclude_none=True),
    )


def _success_log(*, operation: str, workspace_id: str) -> None:
    """仅记录操作、标识和结果，不记录用户输入路径。"""
    logger.info(
        "workspace_operation_succeeded operation=%s workspace_id=%s",
        operation,
        workspace_id,
    )


@router.get("", response_model=WorkspaceListResponse)
def list_workspaces(service: WorkspaceService) -> WorkspaceListResponse | JSONResponse:
    """读取稳定排序的 Workspace 列表及当前可用性投影。"""
    try:
        response = WorkspaceListResponse(
            items=[WorkspaceResponse.from_result(result) for result in service.list_all()]
        )
    except WorkspaceDomainError as error:
        return _error_response(operation="list", error=error)

    logger.info("workspace_operation_succeeded operation=list workspace_id=-")
    return response


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    body: CreateWorkspaceRequest,
    service: WorkspaceService,
) -> WorkspaceResponse | JSONResponse:
    """创建并打开一个新的 Workspace。"""
    try:
        response = WorkspaceResponse.from_result(service.create(body.root_path, body.name))
    except WorkspaceDomainError as error:
        return _error_response(operation="create", error=error)

    _success_log(operation="create", workspace_id=response.id)
    return response


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
def rename_workspace(
    workspace_id: str,
    body: RenameWorkspaceRequest,
    service: WorkspaceService,
) -> WorkspaceResponse | JSONResponse:
    """仅更新 Workspace 显示名称，不接受根路径变更。"""
    try:
        response = WorkspaceResponse.from_result(service.rename(workspace_id, body.name))
    except WorkspaceDomainError as error:
        return _error_response(operation="rename", error=error, workspace_id=workspace_id)

    _success_log(operation="rename", workspace_id=response.id)
    return response


@router.post("/{workspace_id}/open", response_model=WorkspaceResponse)
def open_workspace(
    workspace_id: str,
    service: WorkspaceService,
) -> WorkspaceResponse | JSONResponse:
    """重新验证并打开指定 Workspace。"""
    try:
        response = WorkspaceResponse.from_result(service.open(workspace_id))
    except WorkspaceDomainError as error:
        return _error_response(operation="open", error=error, workspace_id=workspace_id)

    _success_log(operation="open", workspace_id=response.id)
    return response
