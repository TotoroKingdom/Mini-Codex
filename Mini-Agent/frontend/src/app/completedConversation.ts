import type { TimelineItem } from '../presentation';

export const completedConversation: readonly TimelineItem[] = [
  {
    id: 'completed-user-1',
    kind: 'user-message',
    content: '请生成一段固定的示例回复。',
    createdAtLabel: '示例标记',
  },
  {
    id: 'completed-reasoning-1',
    kind: 'reasoning',
    title: '处理完成',
    content: '已按固定展示数据完成处理。',
    defaultExpanded: false,
    isActive: false,
  },
  {
    id: 'completed-tool-call-1',
    kind: 'tool-call',
    toolCallId: 'example-call-1',
    toolName: 'example_tool',
    summary: '处理示例输入',
    input: '{\n  "input": "示例值"\n}',
    status: 'completed',
    requiresApproval: false,
  },
  {
    id: 'completed-tool-result-1',
    kind: 'tool-result',
    toolCallId: 'example-call-1',
    outcome: 'success',
    content: '示例处理已完成。',
    durationLabel: '示例记录',
  },
  {
    id: 'completed-assistant-1',
    kind: 'assistant-message',
    content: '这是固定展示数据生成的示例回复。',
    createdAtLabel: '示例标记',
    isPartial: false,
  },
];
