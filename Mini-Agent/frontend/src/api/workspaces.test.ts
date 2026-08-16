/** Workspace API 配置、严格 DTO 校验和失败边界测试。 */

import { describe, expect, it, vi } from 'vitest';

import {
  WorkspaceClientError,
  createWorkspace,
  listWorkspaces,
  openWorkspace,
  renameWorkspace,
  validateWorkspaceErrorEnvelope,
  validateWorkspaceListResponse,
  validateWorkspaceResponse,
} from './workspaces';

const workspace = {
  id: 'workspace-1',
  name: 'Mini Agent',
  root_path: 'C:\\work\\mini-agent',
  availability: 'available',
  created_at: '2026-08-16T08:00:00.000Z',
  updated_at: '2026-08-16T08:00:00.000Z',
  last_opened_at: '2026-08-16T08:00:00.000Z',
} as const;

const domainErrors = [
  { status: 404, code: 'workspace_not_found', message: 'The workspace was not found.' },
  {
    status: 409,
    code: 'workspace_already_exists',
    message: 'The workspace has already been added.',
    field: 'root_path',
    workspace_id: 'workspace-existing',
  },
  { status: 422, code: 'workspace_name_invalid', message: 'The workspace name is invalid.', field: 'name' },
  { status: 422, code: 'workspace_path_invalid', message: 'The workspace path is invalid.', field: 'root_path' },
  { status: 422, code: 'workspace_path_missing', message: 'The workspace path does not exist.', field: 'root_path' },
  {
    status: 422,
    code: 'workspace_path_not_directory',
    message: 'The workspace path is not a directory.',
    field: 'root_path',
  },
  { status: 403, code: 'workspace_path_inaccessible', message: 'The workspace path is inaccessible.', field: 'root_path' },
  { status: 500, code: 'workspace_persistence_failed', message: 'The workspace could not be saved.' },
] as const;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Workspace DTO 校验', () => {
  it('只接受固定字段、固定枚举和固定毫秒 UTC 时间', () => {
    expect(validateWorkspaceResponse(workspace)).toEqual(workspace);
    expect(() => validateWorkspaceResponse({ ...workspace, root_path_key: 'private-key' })).toThrow(WorkspaceClientError);
    expect(() => validateWorkspaceResponse({ ...workspace, availability: 'unknown' })).toThrow(WorkspaceClientError);
    expect(() => validateWorkspaceResponse({ ...workspace, created_at: '2026-08-16T08:00:00Z' })).toThrow(WorkspaceClientError);
    expect(() => validateWorkspaceResponse({ ...workspace, updated_at: '2026-02-30T08:00:00.000Z' })).toThrow(WorkspaceClientError);
    const { name: _name, ...missingName } = workspace;
    expect(() => validateWorkspaceResponse(missingName)).toThrow(WorkspaceClientError);
  });

  it('只接受 items 信封，拒绝裸数组和分页字段', () => {
    expect(validateWorkspaceListResponse({ items: [workspace] })).toEqual({ items: [workspace] });
    expect(() => validateWorkspaceListResponse([workspace])).toThrow(WorkspaceClientError);
    expect(() => validateWorkspaceListResponse({ items: [workspace], next_page: 'private-token' })).toThrow(WorkspaceClientError);
  });

  it('只接受状态、代码和稳定字段均匹配的领域错误信封', () => {
    const duplicate = domainErrors[1];
    expect(() => validateWorkspaceErrorEnvelope({ error: { ...duplicate, status: undefined } }, duplicate.status)).toThrow(WorkspaceClientError);
    expect(validateWorkspaceErrorEnvelope({ error: { code: duplicate.code, message: duplicate.message, field: duplicate.field, workspace_id: duplicate.workspace_id } }, duplicate.status)).toEqual({
      error: {
        code: duplicate.code,
        message: duplicate.message,
        field: duplicate.field,
        workspace_id: duplicate.workspace_id,
      },
    });
    expect(() => validateWorkspaceErrorEnvelope({ error: { code: duplicate.code, message: '<html>private path</html>', field: duplicate.field, workspace_id: duplicate.workspace_id } }, duplicate.status)).toThrow(WorkspaceClientError);
    expect(() => validateWorkspaceErrorEnvelope({ error: { code: duplicate.code, message: duplicate.message, field: duplicate.field, workspace_id: duplicate.workspace_id } }, 422)).toThrow(WorkspaceClientError);
  });
});

describe('Workspace API Client', () => {
  it('精确调用 List 的 URL、Method 和 Header，并返回严格校验后的结果', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ items: [workspace] }));

    await expect(listWorkspaces({ baseUrl: 'https://api.example.test/', fetchImplementation })).resolves.toEqual({ items: [workspace] });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.test/api/workspaces',
      expect.objectContaining({ method: 'GET', headers: { Accept: 'application/json' } }),
    );
  });

  it('只发送默认 Create 必需的 root_path，并在 201 时返回 Workspace', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(workspace, 201));

    await expect(createWorkspace({ root_path: workspace.root_path }, { fetchImplementation })).resolves.toEqual(workspace);
    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/workspaces',
      expect.objectContaining({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_path: workspace.root_path }),
      }),
    );
  });

  it('只发送自定义 Create 名称和 Rename 名称，并编码路径段', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(workspace, 201))
      .mockResolvedValueOnce(jsonResponse({ ...workspace, name: 'Renamed' }));

    await createWorkspace({ root_path: workspace.root_path, name: 'Custom Name' }, { fetchImplementation });
    await renameWorkspace('workspace / one', { name: 'Renamed' }, { fetchImplementation });

    expect(fetchImplementation).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:8000/api/workspaces',
      expect.objectContaining({ body: JSON.stringify({ root_path: workspace.root_path, name: 'Custom Name' }) }),
    );
    expect(fetchImplementation).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:8000/api/workspaces/workspace%20%2F%20one',
      expect.objectContaining({
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Renamed' }),
      }),
    );
  });

  it('精确调用 Open 的 URL、Method 和 Header', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(workspace));

    await expect(openWorkspace('workspace-1', { fetchImplementation })).resolves.toEqual(workspace);
    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/workspaces/workspace-1/open',
      expect.objectContaining({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      }),
    );
  });

  it.each(domainErrors)('保留 $code 的稳定领域错误', async ({ status, code, message, ...detail }) => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ error: { code, message, ...detail } }, status));
    const error = await createWorkspace({ root_path: workspace.root_path }, { fetchImplementation }).catch((failure: unknown) => failure);

    expect(error).toMatchObject({ code: 'domain', status, domainError: { code, message, ...detail } } satisfies Partial<WorkspaceClientError>);
    expect((error as WorkspaceClientError).message).toBe(message);
  });

  it('将非 JSON、错误 Shape 和错误 Status 转换为安全校验错误', async () => {
    const responses = [
      new Response('<html>C:\\private\\workspace</html>', { status: 500 }),
      jsonResponse({ error: { code: 'workspace_not_found', message: 'The workspace was not found.', field: 'root_path' } }, 404),
      jsonResponse({ error: { code: 'workspace_not_found', message: 'The workspace was not found.' } }, 422),
      jsonResponse(workspace, 202),
    ];

    for (const response of responses) {
      const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(response);
      const error = await createWorkspace({ root_path: workspace.root_path }, { fetchImplementation }).catch((failure: unknown) => failure);
      expect(error).toMatchObject({ code: 'invalid_response' });
      expect((error as WorkspaceClientError).message).not.toContain('private');
    }
  });

  it('将网络失败转换为安全错误，且不泄漏原始异常', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockRejectedValue(new Error('C:\\private\\workspace secret failure'));
    const error = await listWorkspaces({ fetchImplementation }).catch((failure: unknown) => failure);

    expect(error).toMatchObject({ code: 'network' });
    expect((error as WorkspaceClientError).message).not.toContain('private');
    expect((error as WorkspaceClientError).message).not.toContain('secret');
  });

  it('将已取消和请求中的取消映射为 Abort', async () => {
    const preAborted = new AbortController();
    preAborted.abort();
    const untouchedFetch = vi.fn<typeof fetch>();
    await expect(listWorkspaces({ fetchImplementation: untouchedFetch, signal: preAborted.signal })).rejects.toMatchObject({ code: 'aborted' });
    expect(untouchedFetch).not.toHaveBeenCalled();

    const controller = new AbortController();
    const fetchImplementation = vi.fn<typeof fetch>((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const request = openWorkspace('workspace-1', { fetchImplementation, signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ code: 'aborted' });
  });
});
