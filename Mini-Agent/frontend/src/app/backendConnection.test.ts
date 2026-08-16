import { describe, expect, it, vi } from 'vitest';

import type { HealthResponse } from '../api';
import {
  createBackendConnection,
  type BackendHealthClient,
} from './backendConnection';

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

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

function readyHealth(): HealthResponse {
  return {
    status: 'ok',
    database: {
      status: 'ready',
      schema_version: '1',
    },
  };
}

describe('createBackendConnection', () => {
  it('初次探测时进入 checking，并在有效 ready 响应后连接成功', async () => {
    const deferred = createDeferred<HealthResponse>();
    const client = vi.fn<BackendHealthClient>(() => deferred.promise);
    const controller = createBackendConnection(client);
    const states: string[] = [];
    controller.subscribe((state) => states.push(state.status));

    const probe = controller.probe();

    expect(controller.getState()).toEqual({ status: 'checking' });
    expect(client).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });

    deferred.resolve(readyHealth());
    await probe;

    expect(controller.getState()).toEqual({ status: 'connected' });
    expect(states).toEqual(['checking', 'connected']);
  });

  it.each([
    new Error('network'),
    new Error('timeout'),
    new Error('http'),
    new Error('invalid response'),
    new Error('aborted'),
  ])('将任意失败统一映射为 disconnected', async (error) => {
    const client = vi.fn<BackendHealthClient>(() => Promise.reject(error));
    const controller = createBackendConnection(client);

    await controller.probe();

    expect(controller.getState()).toEqual({ status: 'disconnected' });
  });

  it('将不满足 ready 条件的响应映射为 disconnected', async () => {
    const client: BackendHealthClient = () =>
      Promise.resolve({
        status: 'ok',
        database: {
          status: 'degraded',
          schema_version: '1',
        },
      } as HealthResponse);
    const controller = createBackendConnection(client);

    await controller.probe();

    expect(controller.getState()).toEqual({ status: 'disconnected' });
  });

  it('Retry 会取消旧请求，且旧结果不能覆盖新结果', async () => {
    const first = createDeferred<HealthResponse>();
    const second = createDeferred<HealthResponse>();
    let firstSignal: AbortSignal | undefined;
    const client = vi
      .fn<BackendHealthClient>()
      .mockImplementationOnce(({ signal }) => {
        firstSignal = signal;
        return first.promise;
      })
      .mockImplementationOnce(() => second.promise);
    const controller = createBackendConnection(client);

    const firstProbe = controller.probe();
    const secondProbe = controller.retry();

    expect(firstSignal?.aborted).toBe(true);
    expect(controller.getState()).toEqual({ status: 'checking' });

    second.resolve(readyHealth());
    await secondProbe;
    first.reject(new Error('old request failed'));
    await firstProbe;

    expect(controller.getState()).toEqual({ status: 'connected' });
  });

  it('dispose 会取消请求，并禁止后续状态提交', async () => {
    const deferred = createDeferred<HealthResponse>();
    let signal: AbortSignal | undefined;
    const client: BackendHealthClient = ({ signal: requestSignal }) => {
      signal = requestSignal;
      return deferred.promise;
    };
    const controller = createBackendConnection(client);
    const states: string[] = [];
    controller.subscribe((state) => states.push(state.status));

    const probe = controller.probe();
    controller.dispose();
    deferred.resolve(readyHealth());
    await probe;

    expect(signal?.aborted).toBe(true);
    expect(controller.getState()).toEqual({ status: 'checking' });
    expect(states).toEqual(['checking']);
  });
});
