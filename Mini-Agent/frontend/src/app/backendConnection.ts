import { getHealth } from '../api';
import type { HealthClientOptions, HealthResponse } from '../api';

/** 后端连接状态仅描述 Health 探测结果，不依赖 UI Harness 状态。 */
export type BackendConnectionStatus = 'checking' | 'connected' | 'disconnected';

export interface BackendConnectionState {
  status: BackendConnectionStatus;
}

export type BackendConnectionListener = (state: BackendConnectionState) => void;

export type BackendHealthClient = (
  options: Pick<HealthClientOptions, 'signal'>,
) => Promise<HealthResponse>;

export interface BackendConnectionController {
  getState(): BackendConnectionState;
  subscribe(listener: BackendConnectionListener): () => void;
  probe(): Promise<void>;
  retry(): Promise<void>;
  dispose(): void;
}

const defaultHealthClient: BackendHealthClient = ({ signal }) => getHealth({ signal });

function isReadyHealthResponse(response: HealthResponse): boolean {
  return response.status === 'ok' && response.database.status === 'ready';
}

/**
 * 创建一个可被界面订阅的后端连接控制器。
 * 每次探测都会使此前请求失效，避免过期结果覆盖最新状态。
 */
export function createBackendConnection(
  client: BackendHealthClient = defaultHealthClient,
): BackendConnectionController {
  let state: BackendConnectionState = { status: 'disconnected' };
  let disposed = false;
  let latestRequestId = 0;
  let activeAbortController: AbortController | undefined;
  const listeners = new Set<BackendConnectionListener>();

  const publish = (nextState: BackendConnectionState): void => {
    if (disposed) {
      return;
    }

    state = nextState;
    listeners.forEach((listener) => listener(state));
  };

  const isCurrentRequest = (requestId: number): boolean =>
    !disposed && requestId === latestRequestId;

  const probe = async (): Promise<void> => {
    if (disposed) {
      return;
    }

    activeAbortController?.abort();
    const requestId = ++latestRequestId;
    const abortController = new AbortController();
    activeAbortController = abortController;
    publish({ status: 'checking' });

    try {
      const response = await client({ signal: abortController.signal });

      if (!isCurrentRequest(requestId)) {
        return;
      }

      publish({ status: isReadyHealthResponse(response) ? 'connected' : 'disconnected' });
    } catch {
      // 失败原因不进入 UI 状态；网络、超时、取消与非法响应统一视为断连。
      if (isCurrentRequest(requestId)) {
        publish({ status: 'disconnected' });
      }
    } finally {
      if (isCurrentRequest(requestId)) {
        activeAbortController = undefined;
      }
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
    probe,
    retry: probe,
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
