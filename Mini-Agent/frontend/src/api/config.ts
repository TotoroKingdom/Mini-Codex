/** 前端 API Base URL 的读取与校验边界。 */

export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';

export class ApiBaseUrlError extends Error {
  constructor() {
    super('API Base URL 必须是无路径、查询参数或片段的 HTTP(S) Origin。');
    this.name = 'ApiBaseUrlError';
  }
}

export function normalizeApiBaseUrl(value: string | undefined): string {
  const configuredValue = value === undefined ? DEFAULT_API_BASE_URL : value.trim();
  if (!configuredValue) {
    throw new ApiBaseUrlError();
  }

  let parsed: URL;
  try {
    parsed = new URL(configuredValue);
  } catch {
    throw new ApiBaseUrlError();
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol)
    || !parsed.hostname
    || parsed.username
    || parsed.password
    || !['', '/'].includes(parsed.pathname)
    || parsed.search
    || parsed.hash
  ) {
    throw new ApiBaseUrlError();
  }

  return parsed.origin;
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
}
