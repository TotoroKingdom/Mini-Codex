import { useReducer } from 'react';
import { AppShell } from './app/AppShell';
import { getActiveConversation, getScenario, initialUiHarnessState, uiHarnessReducer } from './app/uiHarness';

export default function App() {
  const [state, dispatch] = useReducer(uiHarnessReducer, initialUiHarnessState);
  const scenario = getScenario(state);
  const activeConversation = getActiveConversation(state);

  return (
    <AppShell
      activeConversation={activeConversation ?? null}
      composerResetKey={state.composerResetKey}
      expandedReasoningIds={state.expandedReasoningIds}
      isAcceptancePanelOpen={state.isAcceptancePanelOpen}
      lastIntent={state.lastIntent}
      onConversationSelect={(conversationId) => dispatch({ type: 'conversation.select', conversationId })}
      onIntent={(intent) => dispatch({ type: 'intent.record', intent })}
      onReasoningToggle={(reasoningId) => dispatch({ type: 'reasoning.toggle', reasoningId })}
      onScenarioSelect={(scenarioId) => dispatch({ type: 'scenario.select', scenarioId })}
      onSidebarToggle={() => dispatch({ type: 'sidebar.toggle' })}
      onToggleAcceptancePanel={() => dispatch({ type: 'acceptance-panel.toggle' })}
      scenario={scenario}
      sidebarCollapsed={state.sidebarCollapsed}
    />
  );
}
