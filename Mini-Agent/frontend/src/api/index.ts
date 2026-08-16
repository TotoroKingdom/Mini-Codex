/** Frontend API 模块的唯一公共导出。 */

export { DEFAULT_API_BASE_URL, ApiBaseUrlError, getApiBaseUrl, normalizeApiBaseUrl } from './config';
export {
  DEFAULT_HEALTH_TIMEOUT_MS,
  HEALTH_ENDPOINT_PATH,
  HealthClientError,
  getHealth,
  validateHealthResponse,
} from './health';
export type {
  DatabaseHealth,
  HealthClientFailureCode,
  HealthClientOptions,
  HealthResponse,
} from './health';

export {
  WORKSPACES_ENDPOINT_PATH,
  WorkspaceClientError,
  createWorkspace,
  listWorkspaces,
  openWorkspace,
  renameWorkspace,
  validateWorkspaceErrorEnvelope,
  validateWorkspaceListResponse,
  validateWorkspaceResponse,
} from './workspaces';
export type {
  CreateWorkspaceCommand,
  RenameWorkspaceCommand,
  Workspace,
  WorkspaceAvailability,
  WorkspaceClientFailureCode,
  WorkspaceClientOptions,
  WorkspaceErrorCode,
  WorkspaceErrorDetail,
  WorkspaceErrorEnvelope,
  WorkspaceListResponse,
} from './workspaces';
