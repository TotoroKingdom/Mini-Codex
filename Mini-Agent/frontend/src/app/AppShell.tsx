import { useRef } from 'react';
import { ApplicationTopBar } from '../components/shell/ApplicationTopBar';
import { AcceptancePanel } from '../components/acceptance/AcceptancePanel';
import { Composer } from '../components/composer/Composer';
import { ConversationTimeline } from '../components/conversation/ConversationTimeline';
import { EmptyConversation } from '../components/conversation/EmptyConversation';
import { ConversationHeader } from '../components/shell/ConversationHeader';
import { Sidebar } from '../components/shell/Sidebar';
import { AddWorkspaceForm } from '../components/workspaces/AddWorkspaceForm';
import { RenameWorkspaceDialog } from '../components/workspaces/RenameWorkspaceDialog';
import { scenarioList, scenarios } from '../fixtures';
import type { ScenarioId, UiIntent, UiIntentHandler, UiScenario } from '../presentation';
import type { ConversationFixture } from '../presentation/types';
import type { BackendConnectionStatus } from './backendConnection';
import type { WorkspaceControllerState } from './workspaceController';
import styles from './AppShell.module.css';

export type AppShellProps = {
  scenario?: UiScenario;
  activeConversation?: ConversationFixture | null;
  backendConnectionStatus?: BackendConnectionStatus;
  sidebarCollapsed?: boolean;
  expandedReasoningIds?: readonly string[];
  composerResetKey?: number;
  isAcceptancePanelOpen?: boolean;
  lastIntent?: UiIntent | null;
  onIntent?: UiIntentHandler;
  onBackendConnectionRetry?: () => void;
  onScenarioSelect?: (scenarioId: ScenarioId) => void;
  onConversationSelect?: (conversationId: string) => void;
  onReasoningToggle?: (reasoningId: string) => void;
  onSidebarToggle?: () => void;
  onToggleAcceptancePanel?: () => void;
  workspaceState?: WorkspaceControllerState;
  isAddWorkspaceOpen?: boolean;
  renamingWorkspace?: WorkspaceControllerState['items'][number] | null;
  onWorkspaceAdd?: () => void;
  onWorkspaceAddCancel?: () => void;
  onWorkspaceCreate?: (command: { root_path: string; name?: string }) => void;
  onWorkspaceOpen?: (workspaceId: string) => void;
  onWorkspaceRefresh?: () => void;
  onWorkspaceRename?: (workspaceId: string) => void;
  onWorkspaceRenameCancel?: () => void;
  onWorkspaceRenameSubmit?: (command: { workspace_id: string; name: string }) => void;
};

export function AppShell({
  scenario = scenarios.completed,
  activeConversation = scenarios.completed.conversations[0],
  backendConnectionStatus = 'checking',
  sidebarCollapsed = false,
  expandedReasoningIds = [],
  composerResetKey = 0,
  isAcceptancePanelOpen = false,
  lastIntent = null,
  onIntent,
  onBackendConnectionRetry,
  onScenarioSelect,
  onConversationSelect,
  onReasoningToggle,
  onSidebarToggle,
  onToggleAcceptancePanel,
  workspaceState,
  isAddWorkspaceOpen = false,
  renamingWorkspace = null,
  onWorkspaceAdd,
  onWorkspaceAddCancel,
  onWorkspaceCreate,
  onWorkspaceOpen,
  onWorkspaceRefresh,
  onWorkspaceRename,
  onWorkspaceRenameCancel,
  onWorkspaceRenameSubmit,
}: AppShellProps) {
  const workspaceFocusReturnRef = useRef<HTMLElement | null>(null);
  const resolvedWorkspaceState: WorkspaceControllerState = workspaceState ?? {
    collection: 'idle',
    collection_error: null,
    items: [],
    active_workspace_id: null,
    operation: 'idle',
    operation_error: null,
  };

  return (
    <div className={styles.appShell} data-sidebar-collapsed={sidebarCollapsed}>
      <ApplicationTopBar onSidebarToggle={onSidebarToggle} />
      <div className={styles.workspace}>
        <Sidebar
          activeConversationId={activeConversation?.id ?? null}
          backendConnectionStatus={backendConnectionStatus}
          collapsed={sidebarCollapsed}
          conversations={scenario.conversations}
          onConversationSelect={onConversationSelect}
          onBackendConnectionRetry={onBackendConnectionRetry}
          workspaceActiveId={resolvedWorkspaceState.active_workspace_id}
          workspaceCollectionError={resolvedWorkspaceState.collection_error}
          workspaceCollectionStatus={resolvedWorkspaceState.collection}
          workspaceFocusReturnRef={workspaceFocusReturnRef}
          workspaceItems={resolvedWorkspaceState.items}
          workspaceOperation={resolvedWorkspaceState.operation}
          workspaceOperationError={resolvedWorkspaceState.operation_error}
          onWorkspaceAdd={onWorkspaceAdd}
          onWorkspaceOpen={onWorkspaceOpen}
          onWorkspaceRecheck={onWorkspaceOpen}
          onWorkspaceRefresh={onWorkspaceRefresh}
          onWorkspaceRename={onWorkspaceRename}
          onWorkspaceRetry={onWorkspaceRefresh}
        />
        <div className={styles.conversationPane}>
          <ConversationHeader
            onOverflowClick={onToggleAcceptancePanel}
            runStatus={scenario.runStatus}
            title={activeConversation?.title ?? scenario.name}
          />
          <main aria-label="会话内容" className={styles.mainScroll}>
            <div aria-label="时间线插槽" className={styles.timelineSlot}>
              {activeConversation ? (
                <ConversationTimeline
                  items={activeConversation.timeline}
                  expandedReasoningIds={expandedReasoningIds}
                  onIntent={onIntent}
                  onReasoningToggle={onReasoningToggle}
                />
              ) : <EmptyConversation />}
            </div>
          </main>
          <section aria-label="消息编辑器外壳" className={styles.composerSlot}>
            <Composer key={composerResetKey} mode={scenario.composerMode} onIntent={onIntent ?? (() => undefined)} resetKey={composerResetKey} />
          </section>
        </div>
      </div>
      <AcceptancePanel
        intent={lastIntent}
        isOpen={isAcceptancePanelOpen}
        onClose={onToggleAcceptancePanel ?? (() => undefined)}
        onScenarioSelect={onScenarioSelect ?? (() => undefined)}
        scenario={scenario}
        scenarios={scenarioList}
      />
      {isAddWorkspaceOpen && (
        <div className={styles.workspaceDialogLayer}>
          <AddWorkspaceForm
            error={resolvedWorkspaceState.operation_error}
            onCancel={onWorkspaceAddCancel ?? (() => undefined)}
            onSubmit={onWorkspaceCreate ?? (() => undefined)}
            pending={resolvedWorkspaceState.operation === 'creating'}
            returnFocusRef={workspaceFocusReturnRef}
          />
        </div>
      )}
      {renamingWorkspace && (
        <RenameWorkspaceDialog
          currentName={renamingWorkspace.name}
          error={resolvedWorkspaceState.operation_error}
          onCancel={onWorkspaceRenameCancel ?? (() => undefined)}
          onSubmit={onWorkspaceRenameSubmit ?? (() => undefined)}
          pending={resolvedWorkspaceState.operation === 'renaming'}
          returnFocusRef={workspaceFocusReturnRef}
          workspaceId={renamingWorkspace.id}
        />
      )}
    </div>
  );
}
