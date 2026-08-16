import { render, screen, waitFor } from '@testing-library/react';
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

function readyHealthResponse(): Response {
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

function unavailableHealthResponse(): Response {
  return { status: 503 } as Response;
}

function emptyWorkspaceListResponse(): Response {
  return { status: 200, json: () => Promise.resolve({ items: [] }) } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('M02 regression', () => {
  it('covers Checking, Disconnected, Retry, Connected, compact Sidebar, and safe UI output', async () => {
    const retryResponse = createDeferred<Response>();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(unavailableHealthResponse())
      .mockImplementationOnce(() => retryResponse.promise)
      .mockResolvedValueOnce(emptyWorkspaceListResponse());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText('正在连接后端')).toBeInTheDocument();
    expect(await screen.findByText('后端未连接')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '切换侧边栏' }));
    expect(screen.getByLabelText('后端连接状态：后端未连接')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重试连接后端' }));
    expect(screen.getByText('连接中')).toBeInTheDocument();
    retryResponse.resolve(readyHealthResponse());
    expect(await screen.findByText('已连接')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    expect(document.body).not.toHaveTextContent('C:\\secret');
    expect(document.body).not.toHaveTextContent('<html>');
    expect(document.body).not.toHaveTextContent('Error:');
  });
});
