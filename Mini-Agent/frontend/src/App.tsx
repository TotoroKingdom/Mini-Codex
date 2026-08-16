import { useEffect, useReducer, useRef, useState } from 'react';
import { AppShell } from './app/AppShell';
import {
  createBackendConnection,
  type BackendConnectionController,
  type BackendConnectionStatus,
} from './app/backendConnection';
import {
  createWorkspaceController,
  type WorkspaceController,
  type WorkspaceControllerState,
} from './app/workspaceController';
import { getActiveConversation, getScenario, initialUiHarnessState, uiHarnessReducer } from './app/uiHarness';

const initialWorkspaceState: WorkspaceControllerState = {
  collection: 'idle',
  collection_error: null,
  items: [],
  active_workspace_id: null,
  operation: 'idle',
  operation_error: null,
};

export default function App() {
  const [state, dispatch] = useReducer(uiHarnessReducer, initialUiHarnessState);
  const [backendConnectionStatus, setBackendConnectionStatus] = useState<BackendConnectionStatus>('checking');
  const [workspaceState, setWorkspaceState] = useState<WorkspaceControllerState>(initialWorkspaceState);
  const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
  const [renamingWorkspaceId, setRenamingWorkspaceId] = useState<string | null>(null);
  const backendConnectionRef = useRef<BackendConnectionController | null>(null);
  const workspaceControllerRef = useRef<WorkspaceController | null>(null);
  const scenario = getScenario(state);
  const activeConversation = getActiveConversation(state);

  useEffect(() => {
    const connection = createBackendConnection();
    const workspaceController = createWorkspaceController();
    backendConnectionRef.current = connection;
    workspaceControllerRef.current = workspaceController;
    setWorkspaceState(workspaceController.getState());
    const unsubscribeWorkspace = workspaceController.subscribe(setWorkspaceState);
    const unsubscribeConnection = connection.subscribe((nextState) => {
      setBackendConnectionStatus(nextState.status);
      workspaceController.handleConnectionStatus(nextState.status);
    });
    void connection.probe();

    return () => {
      unsubscribeConnection();
      unsubscribeWorkspace();
      connection.dispose();
      workspaceController.dispose();
      if (backendConnectionRef.current === connection) {
        backendConnectionRef.current = null;
      }
      if (workspaceControllerRef.current === workspaceController) {
        workspaceControllerRef.current = null;
      }
    };
  }, []);

  const renamingWorkspace = renamingWorkspaceId === null
    ? null
    : workspaceState.items.find((workspace) => workspace.id === renamingWorkspaceId) ?? null;

  return (
    <AppShell
      activeConversation={activeConversation ?? null}
      backendConnectionStatus={backendConnectionStatus}
      composerResetKey={state.composerResetKey}
      expandedReasoningIds={state.expandedReasoningIds}
      isAcceptancePanelOpen={state.isAcceptancePanelOpen}
      lastIntent={state.lastIntent}
      onConversationSelect={(conversationId) => dispatch({ type: 'conversation.select', conversationId })}
      onIntent={(intent) => dispatch({ type: 'intent.record', intent })}
      onReasoningToggle={(reasoningId) => dispatch({ type: 'reasoning.toggle', reasoningId })}
      onScenarioSelect={(scenarioId) => dispatch({ type: 'scenario.select', scenarioId })}
      onBackendConnectionRetry={() => { void backendConnectionRef.current?.retry(); }}
      onSidebarToggle={() => dispatch({ type: 'sidebar.toggle' })}
      onToggleAcceptancePanel={() => dispatch({ type: 'acceptance-panel.toggle' })}
      scenario={scenario}
      sidebarCollapsed={state.sidebarCollapsed}
      workspaceState={workspaceState}
      isAddWorkspaceOpen={isAddWorkspaceOpen}
      renamingWorkspace={renamingWorkspace}
      onWorkspaceAdd={() => {
        setRenamingWorkspaceId(null);
        setIsAddWorkspaceOpen(true);
      }}
      onWorkspaceAddCancel={() => setIsAddWorkspaceOpen(false)}
      onWorkspaceCreate={(command) => {
        const controller = workspaceControllerRef.current;
        if (!controller) {
          return;
        }
        void controller.create(command).then(() => {
          if (workspaceControllerRef.current === controller && !controller.getState().operation_error) {
            setIsAddWorkspaceOpen(false);
          }
        });
      }}
      onWorkspaceOpen={(workspaceId) => { void workspaceControllerRef.current?.open(workspaceId); }}
      onWorkspaceRefresh={() => { void workspaceControllerRef.current?.refresh(); }}
      onWorkspaceRename={(workspaceId) => {
        setIsAddWorkspaceOpen(false);
        setRenamingWorkspaceId(workspaceId);
      }}
      onWorkspaceRenameCancel={() => setRenamingWorkspaceId(null)}
      onWorkspaceRenameSubmit={({ workspace_id, name }) => {
        const controller = workspaceControllerRef.current;
        if (!controller) {
          return;
        }
        void controller.rename(workspace_id, { name }).then(() => {
          if (workspaceControllerRef.current === controller && !controller.getState().operation_error) {
            setRenamingWorkspaceId(null);
          }
        });
      }}
    />
  );
}
