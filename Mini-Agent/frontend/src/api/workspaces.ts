/** Workspace DTO 校验与唯一 HTTP Client 边界。 */

import { getApiBaseUrl, normalizeApiBaseUrl } from './config';

export const WORKSPACES_ENDPOINT_PATH = '/api/workspaces';

const UTC_MILLISECOND_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type WorkspaceAvailability = 'available' | 'missing' | 'not_directory' | 'inaccessible';

export type Workspace = {
  id: string;
  name: string;
  root_path: string;
  availability: WorkspaceAvailability;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
};

export type WorkspaceListResponse = {
  items: Workspace[];
};

export type CreateWorkspaceCommand = {
  root_path: string;
  name?: string;
};

export type RenameWorkspaceCommand = {
  name: string;
};

export type WorkspaceErrorCode =
  | 'workspace_not_found'
  | 'workspace_already_exists'
  | 'workspace_name_invalid'
  | 'workspace_path_invalid'
  | 'workspace_path_missing'
  | 'workspace_path_not_directory'
  | 'workspace_path_inaccessible'
  | 'workspace_persistence_failed';

export type WorkspaceErrorDetail = {
  code: WorkspaceErrorCode;
  message: string;
  field?: 'name' | 'root_path';
  workspace_id?: string;
};

export type WorkspaceErrorEnvelope = {
  error: WorkspaceErrorDetail;
};

export type WorkspaceClientFailureCode = 'domain' | 'invalid_response' | 'network' | 'aborted';

export class WorkspaceClientError extends Error {
  readonly code: WorkspaceClientFailureCode;
  readonly status: number | undefined;
  readonly domainError: WorkspaceErrorDetail | undefined;

  constructor(
    code: WorkspaceClientFailureCode,
    options: { status?: number; domainError?: WorkspaceErrorDetail } = {},
  ) {
    super(code === 'domain' ? options.domainError?.message ?? workspaceClientErrorMessage(code) : workspaceClientErrorMessage(code));
    this.name = 'WorkspaceClientError';
    this.code = code;
    this.status = options.status;
    this.domainError = options.domainError;
  }
}

export type WorkspaceClientOptions = {
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  signal?: AbortSignal;
};

type WorkspaceRequestOptions = WorkspaceClientOptions & {
  expectedStatus: number;
  validateSuccess: (payload: unknown) => Workspace | WorkspaceListResponse;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  body?: Record<string, string>;
};

const domainErrors: Record<WorkspaceErrorCode, { status: number; message: string; field?: 'name' | 'root_path'; requiresWorkspaceId?: boolean }> = {
  workspace_not_found: { status: 404, message: 'The workspace was not found.' },
  workspace_already_exists: {
    status: 409,
    message: 'The workspace has already been added.',
    field: 'root_path',
    requiresWorkspaceId: true,
  },
  workspace_name_invalid: { status: 422, message: 'The workspace name is invalid.', field: 'name' },
  workspace_path_invalid: { status: 422, message: 'The workspace path is invalid.', field: 'root_path' },
  workspace_path_missing: { status: 422, message: 'The workspace path does not exist.', field: 'root_path' },
  workspace_path_not_directory: { status: 422, message: 'The workspace path is not a directory.', field: 'root_path' },
  workspace_path_inaccessible: { status: 403, message: 'The workspace path is inaccessible.', field: 'root_path' },
  workspace_persistence_failed: { status: 500, message: 'The workspace could not be saved.' },
};

function workspaceClientErrorMessage(code: WorkspaceClientFailureCode): string {
  switch (code) {
    case 'domain':
      return '工作区操作未能完成。';
    case 'invalid_response':
      return '工作区服务响应不符合预期格式。';
    case 'network':
      return '无法连接工作区服务。';
    case 'aborted':
      return '工作区请求已取消。';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && expectedKeys.every((key) => key in value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isUtcMillisecondTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && UTC_MILLISECOND_TIMESTAMP.test(value)
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function invalidResponse(): never {
  throw new WorkspaceClientError('invalid_response');
}

export function validateWorkspaceResponse(payload: unknown): Workspace {
  if (!isRecord(payload) || !hasExactKeys(payload, [
    'id',
    'name',
    'root_path',
    'availability',
    'created_at',
    'updated_at',
    'last_opened_at',
  ])) {
    return invalidResponse();
  }

  if (
    !isNonEmptyString(payload.id)
    || !isNonEmptyString(payload.name)
    || !isNonEmptyString(payload.root_path)
    || !['available', 'missing', 'not_directory', 'inaccessible'].includes(payload.availability as string)
    || !isUtcMillisecondTimestamp(payload.created_at)
    || !isUtcMillisecondTimestamp(payload.updated_at)
    || !isUtcMillisecondTimestamp(payload.last_opened_at)
  ) {
    return invalidResponse();
  }

  return payload as Workspace;
}

export function validateWorkspaceListResponse(payload: unknown): WorkspaceListResponse {
  if (!isRecord(payload) || !hasExactKeys(payload, ['items']) || !Array.isArray(payload.items)) {
    return invalidResponse();
  }

  return { items: payload.items.map(validateWorkspaceResponse) };
}

export function validateWorkspaceErrorEnvelope(payload: unknown, status: number): WorkspaceErrorEnvelope {
  if (!isRecord(payload) || !hasExactKeys(payload, ['error']) || !isRecord(payload.error)) {
    return invalidResponse();
  }

  const detail = payload.error;
  const keys = ['code', 'message'];
  if ('field' in detail) {
    keys.push('field');
  }
  if ('workspace_id' in detail) {
    keys.push('workspace_id');
  }
  if (!hasExactKeys(detail, keys) || typeof detail.code !== 'string') {
    return invalidResponse();
  }

  const expected = domainErrors[detail.code as WorkspaceErrorCode];
  if (
    !expected
    || status !== expected.status
    || detail.message !== expected.message
    || ('field' in detail && detail.field !== expected.field)
    || (!('field' in detail) && expected.field !== undefined)
    || ('workspace_id' in detail && !isNonEmptyString(detail.workspace_id))
    || (expected.requiresWorkspaceId && !('workspace_id' in detail))
  ) {
    return invalidResponse();
  }

  return { error: detail as WorkspaceErrorDetail };
}

function workspaceUrl(baseUrl: string | undefined, path: string): string {
  return `${normalizeApiBaseUrl(baseUrl ?? getApiBaseUrl())}${path}`;
}

function workspacePath(workspaceId: string): string {
  return `${WORKSPACES_ENDPOINT_PATH}/${encodeURIComponent(workspaceId)}`;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new WorkspaceClientError('invalid_response');
  }
}

async function requestWorkspace<T extends Workspace | WorkspaceListResponse>(
  options: WorkspaceRequestOptions,
): Promise<T> {
  if (options.signal?.aborted) {
    throw new WorkspaceClientError('aborted');
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetchImplementation(workspaceUrl(options.baseUrl, options.path), {
      method: options.method,
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: options.signal,
    });
    if (options.signal?.aborted) {
      throw new WorkspaceClientError('aborted');
    }

    const payload = await parseJson(response);
    if (response.status === options.expectedStatus) {
      return options.validateSuccess(payload) as T;
    }

    const envelope = validateWorkspaceErrorEnvelope(payload, response.status);
    throw new WorkspaceClientError('domain', { status: response.status, domainError: envelope.error });
  } catch (error) {
    if (error instanceof WorkspaceClientError) {
      throw error;
    }
    if (options.signal?.aborted) {
      throw new WorkspaceClientError('aborted');
    }
    throw new WorkspaceClientError('network');
  }
}

export function listWorkspaces(options: WorkspaceClientOptions = {}): Promise<WorkspaceListResponse> {
  return requestWorkspace<WorkspaceListResponse>({
    ...options,
    expectedStatus: 200,
    method: 'GET',
    path: WORKSPACES_ENDPOINT_PATH,
    validateSuccess: validateWorkspaceListResponse,
  });
}

export function createWorkspace(
  command: CreateWorkspaceCommand,
  options: WorkspaceClientOptions = {},
): Promise<Workspace> {
  const body: Record<string, string> = { root_path: command.root_path };
  if (command.name !== undefined) {
    body.name = command.name;
  }
  return requestWorkspace<Workspace>({
    ...options,
    body,
    expectedStatus: 201,
    method: 'POST',
    path: WORKSPACES_ENDPOINT_PATH,
    validateSuccess: validateWorkspaceResponse,
  });
}

export function renameWorkspace(
  workspaceId: string,
  command: RenameWorkspaceCommand,
  options: WorkspaceClientOptions = {},
): Promise<Workspace> {
  return requestWorkspace<Workspace>({
    ...options,
    body: { name: command.name },
    expectedStatus: 200,
    method: 'PATCH',
    path: workspacePath(workspaceId),
    validateSuccess: validateWorkspaceResponse,
  });
}

export function openWorkspace(
  workspaceId: string,
  options: WorkspaceClientOptions = {},
): Promise<Workspace> {
  return requestWorkspace<Workspace>({
    ...options,
    expectedStatus: 200,
    method: 'POST',
    path: `${workspacePath(workspaceId)}/open`,
    validateSuccess: validateWorkspaceResponse,
  });
}
