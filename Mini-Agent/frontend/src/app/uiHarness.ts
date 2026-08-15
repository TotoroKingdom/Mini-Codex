import { DEFAULT_SCENARIO_ID, scenarios } from '../fixtures';
import type { ScenarioId, UiIntent, UiScenario } from '../presentation';
import type { ConversationFixture } from '../presentation/types';

export type UiHarnessState = {
  scenarioId: ScenarioId;
  activeConversationId: string | null;
  sidebarCollapsed: boolean;
  expandedReasoningIds: readonly string[];
  composerResetKey: number;
  lastIntent: UiIntent | null;
  isAcceptancePanelOpen: boolean;
};

export type UiHarnessAction =
  | { type: 'scenario.select'; scenarioId: ScenarioId }
  | { type: 'conversation.select'; conversationId: string }
  | { type: 'sidebar.toggle' }
  | { type: 'reasoning.toggle'; reasoningId: string }
  | { type: 'acceptance-panel.toggle' }
  | { type: 'intent.record'; intent: UiIntent };

function findConversation(scenario: UiScenario, conversationId: string | null) {
  return scenario.conversations.find((conversation) => conversation.id === conversationId);
}

function defaultExpandedReasoningIds(conversation: ConversationFixture | undefined) {
  return conversation?.timeline.flatMap((item) => (
    item.kind === 'reasoning' && item.defaultExpanded ? [item.id] : []
  )) ?? [];
}

function createScenarioState(
  scenarioId: ScenarioId,
  composerResetKey: number,
  isAcceptancePanelOpen: boolean,
): UiHarnessState {
  const scenario = scenarios[scenarioId];
  const activeConversation = findConversation(scenario, scenario.activeConversationId);

  return {
    scenarioId,
    activeConversationId: scenario.activeConversationId,
    sidebarCollapsed: false,
    expandedReasoningIds: defaultExpandedReasoningIds(activeConversation),
    composerResetKey,
    lastIntent: null,
    isAcceptancePanelOpen,
  };
}

export function createInitialUiHarnessState(): UiHarnessState {
  return createScenarioState(DEFAULT_SCENARIO_ID, 0, false);
}

export const initialUiHarnessState = createInitialUiHarnessState();

export function getScenario(state: UiHarnessState) {
  return scenarios[state.scenarioId];
}

export function getActiveConversation(state: UiHarnessState) {
  return findConversation(getScenario(state), state.activeConversationId);
}

export function uiHarnessReducer(state: UiHarnessState, action: UiHarnessAction): UiHarnessState {
  switch (action.type) {
    case 'scenario.select':
      if (!(action.scenarioId in scenarios)) return state;
      return createScenarioState(action.scenarioId, state.composerResetKey + 1, state.isAcceptancePanelOpen);

    case 'conversation.select': {
      const conversation = findConversation(getScenario(state), action.conversationId);
      if (!conversation) return state;
      return {
        ...state,
        activeConversationId: conversation.id,
        expandedReasoningIds: defaultExpandedReasoningIds(conversation),
      };
    }

    case 'sidebar.toggle':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'reasoning.toggle': {
      const activeConversation = getActiveConversation(state);
      const reasoningExists = activeConversation?.timeline.some(
        (item) => item.kind === 'reasoning' && item.id === action.reasoningId,
      );
      if (!reasoningExists) return state;

      const isExpanded = state.expandedReasoningIds.includes(action.reasoningId);
      return {
        ...state,
        expandedReasoningIds: isExpanded
          ? state.expandedReasoningIds.filter((id) => id !== action.reasoningId)
          : [...state.expandedReasoningIds, action.reasoningId],
      };
    }

    case 'acceptance-panel.toggle':
      return { ...state, isAcceptancePanelOpen: !state.isAcceptancePanelOpen };

    case 'intent.record':
      return { ...state, lastIntent: action.intent };
  }
}
