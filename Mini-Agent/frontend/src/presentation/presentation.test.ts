import { expectTypeOf } from 'vitest';
import {
  COMPOSER_MODES,
  RUN_PRESENTATION_STATUSES,
  TIMELINE_ITEM_KINDS,
  TOOL_PRESENTATION_STATUSES,
  TOOL_RESULT_OUTCOMES,
  UI_INTENT_TYPES,
  type ComposerMode,
  type RunPresentationStatus,
  type TimelineItem,
  type ToolPresentationStatus,
  type ToolResultOutcome,
  type UiIntent,
  type UiIntentHandler,
} from './index';

describe('presentation model contracts', () => {
  it('exposes every SPEC scalar value exactly once', () => {
    expect(RUN_PRESENTATION_STATUSES).toEqual([
      'idle', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled',
    ]);
    expect(TIMELINE_ITEM_KINDS).toEqual([
      'user-message', 'assistant-message', 'reasoning', 'tool-call', 'tool-result', 'status-notice',
    ]);
    expect(TOOL_PRESENTATION_STATUSES).toEqual([
      'requested', 'waiting_approval', 'running', 'completed', 'failed', 'denied', 'cancelled',
    ]);
    expect(TOOL_RESULT_OUTCOMES).toEqual(['success', 'failed', 'cancelled']);
    expect(COMPOSER_MODES).toEqual(['enabled', 'disabled_running', 'disabled_waiting_approval']);
  });

  it('models all six timeline kinds with their required fields', () => {
    const items: TimelineItem[] = [
      { id: 'user-1', kind: 'user-message', content: '请检查界面', createdAtLabel: '10:00' },
      { id: 'assistant-1', kind: 'assistant-message', content: '正在检查。', createdAtLabel: '10:01', isPartial: true },
      { id: 'reasoning-1', kind: 'reasoning', title: '正在分析', content: '检查布局与间距。', defaultExpanded: true, isActive: true },
      { id: 'tool-call-1', kind: 'tool-call', toolCallId: 'call-1', toolName: 'read_file', summary: '读取文件', input: '{"path":"SPEC.md"}', status: 'completed', requiresApproval: false },
      { id: 'tool-result-1', kind: 'tool-result', toolCallId: 'call-1', outcome: 'success', content: '已读取。', durationLabel: '耗时 34 秒' },
      { id: 'notice-1', kind: 'status-notice', tone: 'failed', title: '运行失败', description: '请重试。' },
    ];

    expect(items.map((item) => item.kind)).toEqual(TIMELINE_ITEM_KINDS);
    expect(items.every((item) => item.id.length > 0)).toBe(true);
  });

  it('defines all four UiIntent variants and the shared handler', () => {
    const received: UiIntent[] = [];
    const handler: UiIntentHandler = (intent) => received.push(intent);

    UI_INTENT_TYPES.forEach((type) => {
      if (type === 'composer.submit') handler({ type, content: '提交内容' });
      if (type === 'run.stop') handler({ type });
      if (type === 'permission.approve') handler({ type, toolCallId: 'call-1' });
      if (type === 'permission.deny') handler({ type, toolCallId: 'call-1' });
    });

    expect(received.map((intent) => intent.type)).toEqual(UI_INTENT_TYPES);
  });

  it('restricts scalar and discriminated-union values at type-check time', () => {
    expectTypeOf<RunPresentationStatus>().toEqualTypeOf<(typeof RUN_PRESENTATION_STATUSES)[number]>();
    expectTypeOf<ToolPresentationStatus>().toEqualTypeOf<(typeof TOOL_PRESENTATION_STATUSES)[number]>();
    expectTypeOf<ToolResultOutcome>().toEqualTypeOf<(typeof TOOL_RESULT_OUTCOMES)[number]>();
    expectTypeOf<ComposerMode>().toEqualTypeOf<(typeof COMPOSER_MODES)[number]>();

    // @ts-expect-error Unsupported run states are not assignable.
    const invalidRunStatus: RunPresentationStatus = 'paused';
    // @ts-expect-error Each discriminated union member requires its own fields.
    const invalidTimelineItem: TimelineItem = { id: 'missing-fields', kind: 'tool-call' };
    // @ts-expect-error Permission intents require the referenced Tool Call ID.
    const invalidIntent: UiIntent = { type: 'permission.approve' };

    expect([invalidRunStatus, invalidTimelineItem, invalidIntent]).toHaveLength(3);
  });
});
