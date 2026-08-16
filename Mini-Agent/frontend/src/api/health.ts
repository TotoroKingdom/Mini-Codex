/** Health DTO 校验与唯一 HTTP Client 边界。 */

import { getApiBaseUrl, normalizeApiBaseUrl } from './config';

export const HEALTH_ENDPOINT_PATH = '/api/health';
export const DEFAULT_HEALTH_TIMEOUT_MS = 5_000;

export type DatabaseHealth = {
  status: 'ready' | 'unavailable';
  schema_version: number | null;
};

export type HealthResponse = {
  status: 'ok' | 'degraded';
  service: 'mini-agent-backend';
  api_version: 'v1';
  database: DatabaseHealth;
};

export type HealthClientFailureCode = 'http' | 'invalid_response' | 'network' | 'timeout' | 'aborted';

export class HealthClientError extends Error {
  readonly code: HealthClientFailureCode;
  readonly status: number | undefined;

  constructor(code: HealthClientFailureCode, status?: number) {
    super(healthClientErrorMessage(code));
    this.name = 'HealthClientError';
    this.code = code;
    this.status = status;
  }
}

export type HealthClientOptions = {
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function healthClientErrorMessage(code: HealthClientFailureCode): string {
  switch (code) {
    case 'http':
      return '后端健康检查返回了非成功状态。';
    case 'invalid_response':
      return '后端健康检查响应不符合预期格式。';
    case 'network':
      return '无法连接后端健康检查服务。';
    case 'timeout':
      return '后端健康检查请求超时。';
    case 'aborted':
      return '后端健康检查请求已取消。';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && expectedKeys.every((key) => key in value);
}

export function validateHealthResponse(payload: unknown): HealthResponse {
  if (!isRecord(payload) || !hasExactKeys(payload, ['status', 'service', 'api_version', 'database'])) {
    throw new HealthClientError('invalid_response');
  }

  const database = payload.database;
  if (!isRecord(database) || !hasExactKeys(database, ['status', 'schema_version'])) {
    throw new HealthClientError('invalid_response');
  }

  const hasSchemaVersion = typeof database.schema_version === 'number'
    && Number.isInteger(database.schema_version)
    && database.schema_version >= 1;
  const isReady = database.status === 'ready' && hasSchemaVersion;
  const isUnavailable = database.status === 'unavailable' && database.schema_version === null;
  const hasValidServiceState = (payload.status === 'ok' && isReady) || (payload.status === 'degraded' && isUnavailable);

  if (payload.service !== 'mini-agent-backend' || payload.api_version !== 'v1' || !hasValidServiceState) {
    throw new HealthClientError('invalid_response');
  }

  return payload as HealthResponse;
}

function createRequestSignal(externalSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;

  // 将调用方取消和内部超时合并为单一请求信号，避免遗留未完成请求。
  const abortForExternalSignal = () => controller.abort();
  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', abortForExternalSignal, { once: true });
  }

  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortForExternalSignal);
    },
  };
}

export async function getHealth(options: HealthClientOptions = {}): Promise<HealthResponse> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('Health 请求超时必须是正数。');
  }
  if (options.signal?.aborted) {
    throw new HealthClientError('aborted');
  }

  const requestSignal = createRequestSignal(options.signal, timeoutMs);
  const url = `${normalizeApiBaseUrl(options.baseUrl ?? getApiBaseUrl())}${HEALTH_ENDPOINT_PATH}`;

  try {
    const response = await fetchImplementation(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: requestSignal.signal,
    });
    if (requestSignal.didTimeout()) {
      throw new HealthClientError('timeout');
    }
    if (options.signal?.aborted || requestSignal.signal.aborted) {
      throw new HealthClientError('aborted');
    }
    if (response.status !== 200) {
      throw new HealthClientError('http', response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new HealthClientError('invalid_response');
    }

    return validateHealthResponse(payload);
  } catch (error) {
    if (error instanceof HealthClientError) {
      throw error;
    }
    if (requestSignal.didTimeout()) {
      throw new HealthClientError('timeout');
    }
    if (options.signal?.aborted || requestSignal.signal.aborted) {
      throw new HealthClientError('aborted');
    }
    throw new HealthClientError('network');
  } finally {
    requestSignal.dispose();
  }
}
