import { describe, expect, it, vi } from 'vitest';

import type {
  CreateWorkspaceCommand,
  RenameWorkspaceCommand,
  Workspace,
  WorkspaceClientError,
  WorkspaceClientOptions,
  WorkspaceListResponse,
} from '../api';
import { WorkspaceClientError as WorkspaceClientErrorClass } from '../api';
import {
  createWorkspaceController,
  type WorkspaceClient,
} from './workspaceController';

interface Deferred<Value> {
  promise: Promise<Value>;
  resolve(value: Value): void;
  reject(reason?: unknown): void;
}

function createDeferred<Value>(): Deferred<Value> {
  let resolvePromise: (value: Value) => void = () => undefined;
  let rejectPromise: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<Value>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function workspace(id: string, overrides: Partial<Workspace> = {}): Workspace {
  return {
    id,
    name: id,
    root_path: `C:\\work\\${id}`,
    availability: 'available',
    created_at: '2026-08-16T08:00:00.000Z',
    updated_at: '2026-08-16T08:00:00.000Z',
    last_opened_at: '2026-08-16T08:00:00.000Z',
    ...overrides,
  };
}

function createClient(overrides: Partial<WorkspaceClient> = {}): WorkspaceClient {
  return {
    list: vi.fn<(options: Pick<WorkspaceClientOptions, 'signal'>) => Promise<WorkspaceListResponse>>()
      .mockResolvedValue({ items: [] }),
    create: vi.fn<(command: CreateWorkspaceCommand, options: Pick<WorkspaceClientOptions, 'signal'>) => Promise<Workspace>>(),
    rename: vi.fn<(workspaceId: string, command: RenameWorkspaceCommand, options: Pick<WorkspaceClientOptions, 'signal'>) => Promise<Workspace>>(),
    open: vi.fn<(workspaceId: string, options: Pick<WorkspaceClientOptions, 'signal'>) => Promise<Workspace>>(),
    ...overrides,
  };
}

function domainError(detail: {
  code: 'workspace_already_exists';
  message: string;
  field: 'root_path';
  workspace_id: string;
}): WorkspaceClientError {
  return new WorkspaceClientErrorClass('domain', { status: 409, domainError: detail });
}

describe('createWorkspaceController', () => {
  it('以 Idle、空集合和未选择状态开始，并支持订阅与退订', () => {
    const controller = createWorkspaceController(createClient());
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    expect(controller.getState()).toEqual({
      collection: 'idle',
      collection_error: null,
      items: [],
      active_workspace_id: null,
      operation: 'idle',
      operation_error: null,
    });
    unsubscribe();
    void controller.refresh();
    expect(listener).not.toHaveBeenCalled();
  });

  it('首次 connected 加载一次，列表成功不自动选择，并按服务端规则重排', async () => {
    const client = createClient({
      list: vi.fn().mockResolvedValue({
        items: [
          workspace('b', { created_at: '2026-08-16T08:01:00.000Z', last_opened_at: '2026-08-16T08:02:00.000Z' }),
          workspace('a', { created_at: '2026-08-16T08:02:00.000Z', last_opened_at: '2026-08-16T08:02:00.000Z' }),
          workspace('c', { created_at: '2026-08-16T08:00:00.000Z', last_opened_at: '2026-08-16T08:03:00.000Z' }),
        ],
      }),
    });
    const controller = createWorkspaceController(client);

    controller.handleConnectionStatus('connected');
    expect(controller.getState()).toMatchObject({ collection: 'loading', operation: 'refreshing' });
    await Promise.resolve();

    expect(client.list).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({
      collection: 'ready',
      active_workspace_id: null,
      operation: 'idle',
    });
    expect(controller.getState().items.map((item) => item.id)).toEqual(['c', 'a', 'b']);
    controller.handleConnectionStatus('connected');
    expect(client.list).toHaveBeenCalledTimes(1);
  });

  it('显式 Refresh 与重新连接会重新加载，且保留空列表的 Ready 状态', async () => {
    const client = createClient();
    const controller = createWorkspaceController(client);

    controller.handleConnectionStatus('connected');
    await Promise.resolve();
    await controller.refresh();
    controller.handleConnectionStatus('checking');
    controller.handleConnectionStatus('connected');
    await Promise.resolve();

    expect(client.list).toHaveBeenCalledTimes(3);
    expect(controller.getState()).toMatchObject({ collection: 'ready', items: [], active_workspace_id: null });
  });

  it('List 失败保留最近成功集合并投影安全的 Collection Error', async () => {
    const privateError = new Error('C:\\private\\workspace secret');
    const client = createClient({
      list: vi.fn()
        .mockResolvedValueOnce({ items: [workspace('kept')] })
        .mockRejectedValueOnce(privateError),
    });
    const controller = createWorkspaceController(client);

    await controller.refresh();
    await controller.refresh();

    expect(controller.getState()).toMatchObject({
      collection: 'error',
      items: [workspace('kept')],
      operation: 'idle',
      collection_error: '无法加载工作区列表，请稍后重试。',
    });
    expect(controller.getState().collection_error).not.toContain('private');
  });

  it('Create 成功合并并选择返回项，且不会额外 List', async () => {
    const created = workspace('created', { last_opened_at: '2026-08-16T08:03:00.000Z' });
    const client = createClient({
      list: vi.fn().mockResolvedValue({ items: [workspace('existing')] }),
      create: vi.fn().mockResolvedValue(created),
    });
    const controller = createWorkspaceController(client);
    await controller.refresh();

    const operation = controller.create({ root_path: created.root_path });
    expect(controller.getState()).toMatchObject({ operation: 'creating', operation_error: null });
    await operation;

    expect(controller.getState().items.map((item) => item.id)).toEqual(['created', 'existing']);
    expect(controller.getState().active_workspace_id).toBe('created');
    expect(client.list).toHaveBeenCalledTimes(1);
  });

  it('Rename 成功合并返回项但保留当前选择', async () => {
    const original = workspace('workspace-1');
    const renamed = workspace('workspace-1', { name: 'Renamed', updated_at: '2026-08-16T08:01:00.000Z' });
    const client = createClient({
      create: vi.fn().mockResolvedValue(original),
      rename: vi.fn().mockResolvedValue(renamed),
    });
    const controller = createWorkspaceController(client);
    await controller.create({ root_path: original.root_path });
    await controller.rename(original.id, { name: 'Renamed' });

    expect(controller.getState()).toMatchObject({ active_workspace_id: original.id, operation: 'idle' });
    expect(controller.getState().items).toEqual([renamed]);
    expect(client.list).not.toHaveBeenCalled();
  });

  it('Open 成功合并返回项、选择它且重新排序', async () => {
    const older = workspace('older');
    const opened = workspace('older', {
      last_opened_at: '2026-08-16T08:05:00.000Z',
      updated_at: '2026-08-16T08:05:00.000Z',
    });
    const client = createClient({
      create: vi.fn().mockResolvedValue(older),
      open: vi.fn().mockResolvedValue(opened),
    });
    const controller = createWorkspaceController(client);
    await controller.create({ root_path: older.root_path });
    await controller.open(older.id);

    expect(controller.getState()).toMatchObject({ active_workspace_id: older.id, items: [opened] });
    expect(client.list).not.toHaveBeenCalled();
  });

  it('领域失败保留集合和选择，并投影可展示的 Duplicate 错误', async () => {
    const existing = workspace('existing');
    const client = createClient({
      create: vi.fn()
        .mockResolvedValueOnce(existing)
        .mockRejectedValueOnce(domainError({
          code: 'workspace_already_exists',
          message: 'The workspace has already been added.',
          field: 'root_path',
          workspace_id: existing.id,
        })),
    });
    const controller = createWorkspaceController(client);
    await controller.create({ root_path: existing.root_path });
    await controller.create({ root_path: existing.root_path });

    expect(controller.getState()).toMatchObject({
      items: [existing],
      active_workspace_id: existing.id,
      operation: 'idle',
      operation_error: {
        code: 'workspace_already_exists',
        field: 'root_path',
        workspace_id: existing.id,
      },
    });
  });

  it('快速重复操作取消旧请求，只有最新结果可以提交', async () => {
    const first = createDeferred<Workspace>();
    const second = createDeferred<Workspace>();
    let firstSignal: AbortSignal | undefined;
    const client = createClient({
      create: vi.fn()
        .mockImplementationOnce((_command, { signal }) => {
          firstSignal = signal;
          return first.promise;
        })
        .mockImplementationOnce(() => second.promise),
    });
    const controller = createWorkspaceController(client);

    const firstCreate = controller.create({ root_path: 'C:\\work\\first' });
    const secondCreate = controller.create({ root_path: 'C:\\work\\second' });
    expect(firstSignal?.aborted).toBe(true);

    second.resolve(workspace('second'));
    await secondCreate;
    first.resolve(workspace('first'));
    await firstCreate;

    expect(controller.getState()).toMatchObject({ items: [workspace('second')], active_workspace_id: 'second' });
  });

  it('Refresh 的过期响应和 Abort 不会覆盖新集合或显示操作错误', async () => {
    const first = createDeferred<WorkspaceListResponse>();
    const second = createDeferred<WorkspaceListResponse>();
    let firstSignal: AbortSignal | undefined;
    const client = createClient({
      list: vi.fn()
        .mockImplementationOnce(({ signal }) => {
          firstSignal = signal;
          return first.promise;
        })
        .mockImplementationOnce(() => second.promise),
    });
    const controller = createWorkspaceController(client);

    const firstRefresh = controller.refresh();
    const secondRefresh = controller.refresh();
    expect(firstSignal?.aborted).toBe(true);
    second.resolve({ items: [workspace('new')] });
    await secondRefresh;
    first.reject(new WorkspaceClientErrorClass('aborted'));
    await firstRefresh;

    expect(controller.getState()).toMatchObject({ items: [workspace('new')], operation: 'idle', operation_error: null });
  });

  it('Dispose 取消请求，清空监听器并禁止旧结果发布', async () => {
    const deferred = createDeferred<WorkspaceListResponse>();
    let signal: AbortSignal | undefined;
    const client = createClient({
      list: vi.fn(({ signal: requestSignal }) => {
        signal = requestSignal;
        return deferred.promise;
      }),
    });
    const controller = createWorkspaceController(client);
    const listener = vi.fn();
    controller.subscribe(listener);

    const refresh = controller.refresh();
    controller.dispose();
    deferred.resolve({ items: [workspace('late')] });
    await refresh;

    expect(signal?.aborted).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({ collection: 'loading', items: [] });
  });
});
