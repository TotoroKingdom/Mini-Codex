import type {
  CreateWorkspaceCommand,
  RenameWorkspaceCommand,
  Workspace,
  WorkspaceClientOptions,
  WorkspaceErrorCode,
  WorkspaceErrorDetail,
  WorkspaceListResponse,
} from '../api';
import {
  WorkspaceClientError,
  createWorkspace,
  listWorkspaces,
  openWorkspace,
  renameWorkspace,
} from '../api';
import type { BackendConnectionStatus } from './backendConnection';

/** Workspace 集合和操作的可订阅运行时状态。 */
export type WorkspaceCollectionStatus = 'idle' | 'loading' | 'ready' | 'error';
export type WorkspaceOperationStatus = 'idle' | 'creating' | 'renaming' | 'opening' | 'refreshing';

export type WorkspaceOperationError = {
  code?: WorkspaceErrorCode;
  field?: WorkspaceErrorDetail['field'];
  message: string;
  workspace_id?: string;
};

export type WorkspaceControllerState = {
  collection: WorkspaceCollectionStatus;
  collection_error: string | null;
  items: Workspace[];
  active_workspace_id: string | null;
  operation: WorkspaceOperationStatus;
  operation_error: WorkspaceOperationError | null;
};

export type WorkspaceControllerListener = (state: WorkspaceControllerState) => void;

export type WorkspaceClient = {
  list(options: Pick<WorkspaceClientOptions, 'signal'>): Promise<WorkspaceListResponse>;
  create(command: CreateWorkspaceCommand, options: Pick<WorkspaceClientOptions, 'signal'>): Promise<Workspace>;
  rename(workspaceId: string, command: RenameWorkspaceCommand, options: Pick<WorkspaceClientOptions, 'signal'>): Promise<Workspace>;
  open(workspaceId: string, options: Pick<WorkspaceClientOptions, 'signal'>): Promise<Workspace>;
};

export interface WorkspaceController {
  getState(): WorkspaceControllerState;
  subscribe(listener: WorkspaceControllerListener): () => void;
  handleConnectionStatus(status: BackendConnectionStatus): void;
  refresh(): Promise<void>;
  create(command: CreateWorkspaceCommand): Promise<void>;
  rename(workspaceId: string, command: RenameWorkspaceCommand): Promise<void>;
  open(workspaceId: string): Promise<void>;
  dispose(): void;
}

const defaultWorkspaceClient: WorkspaceClient = {
  list: ({ signal }) => listWorkspaces({ signal }),
  create: (command, { signal }) => createWorkspace(command, { signal }),
  rename: (workspaceId, command, { signal }) => renameWorkspace(workspaceId, command, { signal }),
  open: (workspaceId, { signal }) => openWorkspace(workspaceId, { signal }),
};

const initialState: WorkspaceControllerState = {
  collection: 'idle',
  collection_error: null,
  items: [],
  active_workspace_id: null,
  operation: 'idle',
  operation_error: null,
};

function sortWorkspaces(items: readonly Workspace[]): Workspace[] {
  return [...items].sort((left, right) => {
    if (left.last_opened_at !== right.last_opened_at) {
      return left.last_opened_at < right.last_opened_at ? 1 : -1;
    }
    if (left.created_at !== right.created_at) {
      return left.created_at < right.created_at ? 1 : -1;
    }
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

function mergeWorkspace(items: readonly Workspace[], workspace: Workspace): Workspace[] {
  return sortWorkspaces([...items.filter((item) => item.id !== workspace.id), workspace]);
}

function isAbortError(error: unknown): boolean {
  return error instanceof WorkspaceClientError && error.code === 'aborted';
}

function safeCollectionError(error: unknown): string {
  if (error instanceof WorkspaceClientError) {
    switch (error.code) {
      case 'network':
        return '无法连接工作区服务，请检查后端连接后重试。';
      case 'invalid_response':
        return '工作区服务响应无效，请稍后重试。';
      case 'domain':
        return error.domainError?.message ?? '无法加载工作区列表。';
      case 'aborted':
        return '无法加载工作区列表。';
    }
  }
  return '无法加载工作区列表，请稍后重试。';
}

function safeOperationError(error: unknown): WorkspaceOperationError | null {
  if (isAbortError(error)) {
    return null;
  }
  if (error instanceof WorkspaceClientError && error.code === 'domain' && error.domainError) {
    return {
      code: error.domainError.code,
      field: error.domainError.field,
      message: error.domainError.message,
      workspace_id: error.domainError.workspace_id,
    };
  }
  if (error instanceof WorkspaceClientError) {
    return { message: error.message };
  }
  return { message: '工作区操作未能完成，请稍后重试。' };
}

/**
 * 创建独立于 React 的 Workspace 生命周期控制器。
 * 新请求会取消旧请求并通过递增标识阻止过期结果提交状态。
 */
export function createWorkspaceController(
  client: WorkspaceClient = defaultWorkspaceClient,
): WorkspaceController {
  let state = initialState;
  let disposed = false;
  let connectionStatus: BackendConnectionStatus = 'disconnected';
  let latestRequestId = 0;
  let activeAbortController: AbortController | undefined;
  const listeners = new Set<WorkspaceControllerListener>();

  const publish = (nextState: WorkspaceControllerState): void => {
    if (disposed) {
      return;
    }
    state = nextState;
    listeners.forEach((listener) => listener(state));
  };

  const isCurrentRequest = (requestId: number): boolean => !disposed && requestId === latestRequestId;

  const beginRequest = (): { requestId: number; signal: AbortSignal } => {
    activeAbortController?.abort();
    const requestId = ++latestRequestId;
    const abortController = new AbortController();
    activeAbortController = abortController;
    return { requestId, signal: abortController.signal };
  };

  const finishRequest = (requestId: number): void => {
    if (isCurrentRequest(requestId)) {
      activeAbortController = undefined;
    }
  };

  const refresh = async (): Promise<void> => {
    if (disposed) {
      return;
    }

    const previousState = state;
    const { requestId, signal } = beginRequest();
    publish({
      ...state,
      collection: state.collection === 'ready' ? 'ready' : 'loading',
      collection_error: null,
      operation: 'refreshing',
      operation_error: null,
    });

    try {
      const response = await client.list({ signal });
      if (!isCurrentRequest(requestId)) {
        return;
      }
      publish({
        ...state,
        collection: 'ready',
        collection_error: null,
        items: sortWorkspaces(response.items),
        operation: 'idle',
      });
    } catch (error) {
      if (!isCurrentRequest(requestId)) {
        return;
      }
      if (isAbortError(error)) {
        publish({ ...previousState, operation: 'idle' });
        return;
      }
      publish({
        ...state,
        collection: 'error',
        collection_error: safeCollectionError(error),
        operation: 'idle',
      });
    } finally {
      finishRequest(requestId);
    }
  };

  const runOperation = async (
    operation: Exclude<WorkspaceOperationStatus, 'idle' | 'refreshing'>,
    request: (signal: AbortSignal) => Promise<Workspace>,
    onSuccess: (workspace: Workspace) => Pick<WorkspaceControllerState, 'active_workspace_id'>,
  ): Promise<void> => {
    if (disposed) {
      return;
    }

    const { requestId, signal } = beginRequest();
    publish({ ...state, operation, operation_error: null });

    try {
      const workspace = await request(signal);
      if (!isCurrentRequest(requestId)) {
        return;
      }
      publish({
        ...state,
        ...onSuccess(workspace),
        collection: 'ready',
        collection_error: null,
        items: mergeWorkspace(state.items, workspace),
        operation: 'idle',
      });
    } catch (error) {
      if (!isCurrentRequest(requestId)) {
        return;
      }
      publish({
        ...state,
        operation: 'idle',
        operation_error: safeOperationError(error),
      });
    } finally {
      finishRequest(requestId);
    }
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      if (disposed) {
        return () => undefined;
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    handleConnectionStatus: (nextStatus) => {
      if (disposed || nextStatus === connectionStatus) {
        return;
      }
      connectionStatus = nextStatus;
      if (nextStatus === 'connected') {
        void refresh();
        return;
      }

      const hadActiveRequest = activeAbortController !== undefined;
      activeAbortController?.abort();
      activeAbortController = undefined;
      latestRequestId += 1;
      if (hadActiveRequest) {
        publish({
          ...state,
          collection: state.collection === 'loading' ? 'idle' : state.collection,
          operation: 'idle',
        });
      }
    },
    refresh,
    create: (command) => runOperation(
      'creating',
      (signal) => client.create(command, { signal }),
      (workspace) => ({ active_workspace_id: workspace.id }),
    ),
    rename: (workspaceId, command) => runOperation(
      'renaming',
      (signal) => client.rename(workspaceId, command, { signal }),
      () => ({ active_workspace_id: state.active_workspace_id }),
    ),
    open: (workspaceId) => runOperation(
      'opening',
      (signal) => client.open(workspaceId, { signal }),
      (workspace) => ({ active_workspace_id: workspace.id }),
    ),
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      latestRequestId += 1;
      activeAbortController?.abort();
      activeAbortController = undefined;
      listeners.clear();
    },
  };
}
