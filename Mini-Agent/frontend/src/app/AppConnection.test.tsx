import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

interface Deferred<Value> {
  promise: Promise<Value>;
  resolve(value: Value): void;
}

function createDeferred<Value>(): Deferred<Value> {
  let resolvePromise: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

function readyResponse(): Response {
  return {
    status: 200,
    json: () => Promise.resolve({
      status: 'ok',
      service: 'mini-agent-backend',
      api_version: 'v1',
      database: { status: 'ready', schema_version: 1 },
    }),
  } as Response;
}

function unavailableResponse(): Response {
  return { status: 503 } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App backend connection', () => {
  it('在初次 Probe 时显示 Checking，并在 Health 成功后显示 Connected', async () => {
    const response = createDeferred<Response>();
    vi.stubGlobal('fetch', vi.fn(() => response.promise));

    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('正在连接后端');
    response.resolve(readyResponse());

    expect(await screen.findByText('后端已连接')).toBeInTheDocument();
  });

  it('在后端失败时保持 M01 UI 可用并显示 Disconnected', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(unavailableResponse())));
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByText('后端未连接')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '切换侧边栏' }));
    expect(screen.getByRole('complementary', { name: '侧边栏' })).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByLabelText('后端连接状态：后端未连接')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试连接后端' })).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: '会话标题栏' })).toHaveAttribute('data-run-status', 'completed');
    expect(screen.getByRole('form', { name: '消息编辑器' })).toHaveAttribute('data-mode', 'enabled');
  });

  it('在 Retry 后无需刷新即可从 Disconnected 恢复为 Connected', async () => {
    const retryResponse = createDeferred<Response>();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(unavailableResponse())
      .mockImplementationOnce(() => retryResponse.promise);
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('后端未连接');
    await user.click(screen.getByRole('button', { name: '重试连接后端' }));

    expect(screen.getByRole('status')).toHaveTextContent('正在连接后端');
    retryResponse.resolve(readyResponse());
    expect(await screen.findByText('后端已连接')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('不会让较旧请求覆盖最新 Retry 的连接结果', async () => {
    const firstRetryResponse = createDeferred<Response>();
    const secondRetryResponse = createDeferred<Response>();
    let firstSignal: AbortSignal | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unavailableResponse())
      .mockImplementationOnce((_url: string, options: RequestInit) => {
        firstSignal = options.signal as AbortSignal;
        return firstRetryResponse.promise;
      })
      .mockImplementationOnce(() => secondRetryResponse.promise);
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('后端未连接');
    const retryButton = screen.getByRole('button', { name: '重试连接后端' });
    await act(async () => {
      retryButton.click();
      retryButton.click();
    });

    expect(firstSignal?.aborted).toBe(true);
    secondRetryResponse.resolve(readyResponse());
    expect(await screen.findByText('后端已连接')).toBeInTheDocument();
    firstRetryResponse.resolve(unavailableResponse());

    await Promise.resolve();
    expect(screen.getByRole('status')).toHaveTextContent('后端已连接');
  });

  it('卸载时取消未完成的 Health 请求', async () => {
    const response = createDeferred<Response>();
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => {
      signal = options.signal as AbortSignal;
      return response.promise;
    }));

    const { unmount } = render(<App />);
    unmount();

    expect(signal?.aborted).toBe(true);
    response.resolve(readyResponse());
    await Promise.resolve();
  });
});
