import type { ComposerMode, ConversationFixture, RunPresentationStatus, TimelineItem, UiScenario } from '../presentation/types';
import { DEFAULT_SCENARIO_ID, scenarioList, scenarios } from './scenarios';

const expectedScenarioIds = ['empty', 'completed', 'running', 'waiting-approval', 'failed', 'cancelled'];

const expectedComposerModes: Record<RunPresentationStatus, ComposerMode> = {
  idle: 'enabled',
  running: 'disabled_running',
  waiting_approval: 'disabled_waiting_approval',
  completed: 'enabled',
  failed: 'enabled',
  cancelled: 'enabled',
};

function hasTimelineKind(conversation: ConversationFixture, kind: TimelineItem['kind']) {
  return conversation.timeline.some((item) => item.kind === kind);
}

function activeConversation(scenario: UiScenario) {
  return scenario.conversations.find((conversation) => conversation.id === scenario.activeConversationId);
}

describe('deterministic UI scenarios', () => {
  it('provides exactly the six SPEC scenarios with completed as the default', () => {
    expect(Object.keys(scenarios)).toEqual(expectedScenarioIds);
    expect(scenarioList.map((scenario) => scenario.id)).toEqual(expectedScenarioIds);
    expect(new Set(scenarioList.map((scenario) => scenario.id)).size).toBe(6);
    expect(DEFAULT_SCENARIO_ID).toBe('completed');
  });

  it('keeps active conversation references valid and uses the required Run/Composer pair', () => {
    scenarioList.forEach((scenario) => {
      expect(scenario.composerMode).toBe(expectedComposerModes[scenario.runStatus]);
      if (scenario.id === 'empty') {
        expect(scenario.activeConversationId).toBeNull();
        expect(scenario.conversations).toEqual([]);
      } else {
        expect(scenario.activeConversationId).not.toBeNull();
        expect(activeConversation(scenario)).toBeDefined();
      }
    });
  });

  it('only allows Tool Results to reference a previously seen Tool Call', () => {
    scenarioList.forEach((scenario) => {
      scenario.conversations.forEach((conversation) => {
        const seenToolCallIds = new Set<string>();
        conversation.timeline.forEach((item) => {
          if (item.kind === 'tool-call') seenToolCallIds.add(item.toolCallId);
          if (item.kind === 'tool-result') expect(seenToolCallIds.has(item.toolCallId)).toBe(true);
        });
      });
    });
  });

  it('contains all mandatory Scenario content using fixed Chinese data', () => {
    const completed = scenarios.completed;
    const completedActive = activeConversation(completed)!;
    expect(completed.conversations.filter((conversation) => conversation.collection === 'pinned')).toHaveLength(2);
    expect(completed.conversations.some((conversation) => conversation.title === '项目示例 A')).toBe(true);
    expect(completed.conversations.some((conversation) => conversation.title === '示例记录 A')).toBe(true);
    expect(completedActive.timeline.map((item) => item.kind)).toEqual([
      'user-message', 'reasoning', 'tool-call', 'tool-result', 'assistant-message',
    ]);

    const running = activeConversation(scenarios.running)!;
    expect(running.timeline.some((item) => item.kind === 'reasoning' && item.isActive && item.defaultExpanded)).toBe(true);
    expect(hasTimelineKind(running, 'status-notice')).toBe(true);

    const waiting = activeConversation(scenarios['waiting-approval'])!;
    expect(waiting.timeline.some((item) => item.kind === 'tool-call' && item.status === 'waiting_approval' && item.requiresApproval)).toBe(true);

    const failed = activeConversation(scenarios.failed)!;
    expect(failed.timeline.some((item) => item.kind === 'tool-result' && item.outcome === 'failed')).toBe(true);
    expect(failed.timeline.some((item) => item.kind === 'assistant-message' && item.isPartial)).toBe(true);

    const cancelled = activeConversation(scenarios.cancelled)!;
    expect(cancelled.timeline.some((item) => item.kind === 'assistant-message' && item.isPartial)).toBe(true);
    expect(cancelled.timeline.some((item) => item.kind === 'status-notice' && item.tone === 'cancelled')).toBe(true);
  });
});
