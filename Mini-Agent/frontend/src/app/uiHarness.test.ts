import { scenarios } from '../fixtures';
import type { UiIntent } from '../presentation';
import {
  createInitialUiHarnessState,
  getActiveConversation,
  getScenario,
  uiHarnessReducer,
} from './uiHarness';

describe('UI Harness state', () => {
  it('starts with the completed Fixture defaults and a closed Acceptance Panel', () => {
    const state = createInitialUiHarnessState();

    expect(state).toMatchObject({
      scenarioId: 'completed',
      activeConversationId: 'completed-main',
      sidebarCollapsed: false,
      expandedReasoningIds: [],
      composerResetKey: 0,
      lastIntent: null,
      isAcceptancePanelOpen: false,
    });
    expect(getScenario(state)).toBe(scenarios.completed);
    expect(getActiveConversation(state)?.id).toBe('completed-main');
  });

  it('resets a selected Scenario to its Fixture defaults and increments the Composer reset key', () => {
    let state = createInitialUiHarnessState();
    state = uiHarnessReducer(state, { type: 'sidebar.toggle' });
    state = uiHarnessReducer(state, { type: 'acceptance-panel.toggle' });
    state = uiHarnessReducer(state, { type: 'intent.record', intent: { type: 'run.stop' } });
    state = uiHarnessReducer(state, { type: 'scenario.select', scenarioId: 'running' });

    expect(state).toMatchObject({
      scenarioId: 'running',
      activeConversationId: 'running-main',
      sidebarCollapsed: false,
      expandedReasoningIds: ['running-reasoning-1'],
      composerResetKey: 1,
      lastIntent: null,
      isAcceptancePanelOpen: true,
    });
  });

  it('selects only a valid conversation and does not change the Sidebar state', () => {
    let state = createInitialUiHarnessState();
    state = uiHarnessReducer(state, { type: 'sidebar.toggle' });
    state = uiHarnessReducer(state, { type: 'conversation.select', conversationId: 'completed-history' });

    expect(state.activeConversationId).toBe('completed-history');
    expect(state.sidebarCollapsed).toBe(true);
    expect(state.expandedReasoningIds).toEqual([]);

    const unchanged = uiHarnessReducer(state, { type: 'conversation.select', conversationId: 'not-a-conversation' });
    expect(unchanged).toBe(state);
  });

  it('toggles the Sidebar, Acceptance Panel, and an active Conversation Reasoning item independently', () => {
    let state = uiHarnessReducer(createInitialUiHarnessState(), { type: 'scenario.select', scenarioId: 'running' });

    state = uiHarnessReducer(state, { type: 'reasoning.toggle', reasoningId: 'running-reasoning-1' });
    expect(state.expandedReasoningIds).toEqual([]);
    state = uiHarnessReducer(state, { type: 'reasoning.toggle', reasoningId: 'running-reasoning-1' });
    expect(state.expandedReasoningIds).toEqual(['running-reasoning-1']);

    const unchanged = uiHarnessReducer(state, { type: 'reasoning.toggle', reasoningId: 'not-a-reasoning-item' });
    expect(unchanged).toBe(state);

    state = uiHarnessReducer(state, { type: 'sidebar.toggle' });
    expect(state.sidebarCollapsed).toBe(true);
    expect(state.activeConversationId).toBe('running-main');

    state = uiHarnessReducer(state, { type: 'acceptance-panel.toggle' });
    expect(state.isAcceptancePanelOpen).toBe(true);
  });

  it('records only the most recent UiIntent without changing Fixture-derived state or Fixture data', () => {
    const fixtureSnapshot = JSON.stringify(scenarios);
    const initialState = uiHarnessReducer(createInitialUiHarnessState(), { type: 'scenario.select', scenarioId: 'waiting-approval' });
    const intent: UiIntent = { type: 'permission.approve', toolCallId: 'approval-call-1' };
    const nextState = uiHarnessReducer(initialState, { type: 'intent.record', intent });

    expect(nextState.lastIntent).toEqual(intent);
    expect(nextState.scenarioId).toBe(initialState.scenarioId);
    expect(nextState.activeConversationId).toBe(initialState.activeConversationId);
    expect(nextState.expandedReasoningIds).toEqual(initialState.expandedReasoningIds);
    expect(nextState.composerResetKey).toBe(initialState.composerResetKey);
    expect(JSON.stringify(scenarios)).toBe(fixtureSnapshot);
    expect(getScenario(nextState).runStatus).toBe('waiting_approval');
    expect(getActiveConversation(nextState)?.timeline).toHaveLength(4);
  });

  it('keeps deterministic reset behavior across consecutive Scenario switches', () => {
    let state = createInitialUiHarnessState();
    state = uiHarnessReducer(state, { type: 'scenario.select', scenarioId: 'empty' });
    state = uiHarnessReducer(state, { type: 'scenario.select', scenarioId: 'cancelled' });
    state = uiHarnessReducer(state, { type: 'scenario.select', scenarioId: 'completed' });

    expect(state).toMatchObject({
      scenarioId: 'completed',
      activeConversationId: 'completed-main',
      sidebarCollapsed: false,
      expandedReasoningIds: [],
      composerResetKey: 3,
      lastIntent: null,
      isAcceptancePanelOpen: false,
    });
  });
});
