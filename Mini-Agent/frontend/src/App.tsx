import { useEffect, useReducer, useRef, useState } from 'react';
import { AppShell } from './app/AppShell';
import {
  createBackendConnection,
  type BackendConnectionController,
  type BackendConnectionStatus,
} from './app/backendConnection';
import { getActiveConversation, getScenario, initialUiHarnessState, uiHarnessReducer } from './app/uiHarness';

export default function App() {
  const [state, dispatch] = useReducer(uiHarnessReducer, initialUiHarnessState);
  const [backendConnectionStatus, setBackendConnectionStatus] = useState<BackendConnectionStatus>('checking');
  const backendConnectionRef = useRef<BackendConnectionController | null>(null);
  const scenario = getScenario(state);
  const activeConversation = getActiveConversation(state);

  useEffect(() => {
    const connection = createBackendConnection();
    backendConnectionRef.current = connection;
    const unsubscribe = connection.subscribe((nextState) => setBackendConnectionStatus(nextState.status));
    void connection.probe();

    return () => {
      unsubscribe();
      connection.dispose();
      if (backendConnectionRef.current === connection) {
        backendConnectionRef.current = null;
      }
    };
  }, []);

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
    />
  );
}
