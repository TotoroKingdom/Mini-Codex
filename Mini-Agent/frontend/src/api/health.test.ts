/** Health API 配置、运行时校验和失败边界测试。 */

import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_API_BASE_URL, ApiBaseUrlError, normalizeApiBaseUrl } from './config';
import {
  DEFAULT_HEALTH_TIMEOUT_MS,
  HealthClientError,
  getHealth,
} from './health';

const validHealthPayload = {
  status: 'ok',
  service: 'mini-agent-backend',
  api_version: 'v1',
  database: { status: 'ready', schema_version: 1 },
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Health API Base URL', () => {
  it('uses the loopback default and removes a trailing slash', () => {
    expect(normalizeApiBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL);
    expect(normalizeApiBaseUrl('https://api.example.test/')).toBe('https://api.example.test');
  });

  it.each([
    'ftp://api.example.test',
    'http://api.example.test/api',
    'http://api.example.test?debug=true',
    'http://api.example.test#section',
    'http://user:password@api.example.test',
    '',
  ])('rejects an invalid API Base URL: %s', (baseUrl) => {
    expect(() => normalizeApiBaseUrl(baseUrl)).toThrow(ApiBaseUrlError);
  });
});

describe('getHealth', () => {
  it('calls the fixed Health endpoint and returns a validated success DTO', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(validHealthPayload));

    await expect(getHealth({ baseUrl: 'https://api.example.test/', fetchImplementation })).resolves.toEqual(validHealthPayload);
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.test/api/health',
      expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }),
    );
  });

  it.each([503, 500])('maps HTTP %i to a distinct HTTP failure without reading its body', async (status) => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse('<html>private path</html>', status));

    await expect(getHealth({ fetchImplementation })).rejects.toMatchObject({
      code: 'http',
      status,
    } satisfies Partial<HealthClientError>);
  });

  it('maps non-JSON and invalid Health shapes to a safe validation failure', async () => {
    const nonJsonFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>private path</html>', { status: 200 }));
    const invalidShapeFetch = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ...validHealthPayload, database: { status: 'ready', schema_version: null } }));

    await expect(getHealth({ fetchImplementation: nonJsonFetch })).rejects.toMatchObject({ code: 'invalid_response' });
    await expect(getHealth({ fetchImplementation: invalidShapeFetch })).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('maps network failures without exposing the underlying error message', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockRejectedValue(new Error('C:\\private\\mini-agent.db secret failure'));
    const error = await getHealth({ fetchImplementation }).catch((failure: unknown) => failure);

    expect(error).toMatchObject({ code: 'network' });
    expect(error).toBeInstanceOf(HealthClientError);
    expect((error as HealthClientError).message).not.toContain('private');
    expect((error as HealthClientError).message).not.toContain('secret');
  });

  it('maps a finite timeout to a distinct failure', async () => {
    vi.useFakeTimers();
    const fetchImplementation = vi.fn<typeof fetch>((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));

    const request = getHealth({ fetchImplementation, timeoutMs: DEFAULT_HEALTH_TIMEOUT_MS });
    const rejection = expect(request).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(DEFAULT_HEALTH_TIMEOUT_MS);

    await rejection;
    vi.useRealTimers();
  });

  it('maps an external AbortSignal cancellation to a distinct failure', async () => {
    const controller = new AbortController();
    const fetchImplementation = vi.fn<typeof fetch>((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));

    const request = getHealth({ fetchImplementation, signal: controller.signal });
    const rejection = expect(request).rejects.toMatchObject({ code: 'aborted' });
    controller.abort();

    await rejection;
  });
});
