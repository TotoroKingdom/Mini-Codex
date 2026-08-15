import type { ConversationCollection, ConversationFixture, ScenarioId, UiScenario } from '../presentation/types';

export const DEFAULT_SCENARIO_ID: ScenarioId = 'completed';

const sidebarCollectionItems: readonly { collection: ConversationCollection; title: string }[] = [
  { collection: 'project', title: '项目示例 A' },
  { collection: 'project', title: '项目示例 B' },
  { collection: 'project', title: '项目示例 C' },
  { collection: 'recent', title: '示例记录 A' },
  { collection: 'recent', title: '示例记录 B' },
  { collection: 'recent', title: '示例记录 C' },
  { collection: 'recent', title: '示例记录 D' },
  { collection: 'recent', title: '示例记录 E' },
];

function createSidebarCollectionConversations(scenarioId: ScenarioId): readonly ConversationFixture[] {
  return sidebarCollectionItems.map(({ collection, title }, index) => {
    const id = `${scenarioId}-${collection}-${index + 1}`;
    return {
      id,
      title,
      collection,
      timeline: [
        { id: `${id}-user`, kind: 'user-message', content: `打开${title}。`, createdAtLabel: '示例标记' },
        { id: `${id}-assistant`, kind: 'assistant-message', content: `正在展示${title}的固定记录。`, createdAtLabel: '示例标记', isPartial: false },
      ],
    };
  });
}

export const scenarios: Readonly<Record<ScenarioId, UiScenario>> = {
  empty: {
    id: 'empty',
    name: '空会话',
    description: '展示没有活动会话的固定空白状态。',
    runStatus: 'idle',
    conversations: [],
    activeConversationId: null,
    composerMode: 'enabled',
  },
  completed: {
    id: 'completed',
    name: '已完成',
    description: '展示固定的完整状态组合。',
    runStatus: 'completed',
    activeConversationId: 'completed-main',
    composerMode: 'enabled',
    conversations: [
      {
        id: 'completed-main',
        title: '示例会话 A',
        collection: 'pinned',
        timeline: [
          { id: 'completed-user-1', kind: 'user-message', content: '请生成固定示例内容。', createdAtLabel: '示例标记' },
          { id: 'completed-reasoning-1', kind: 'reasoning', title: '处理完成', content: '已按固定展示数据完成处理。', defaultExpanded: false, isActive: false },
          { id: 'completed-tool-call-1', kind: 'tool-call', toolCallId: 'completed-call-1', toolName: 'example_tool', summary: '处理示例输入', input: '{\n  "input": "示例值"\n}', status: 'completed', requiresApproval: false },
          { id: 'completed-tool-result-1', kind: 'tool-result', toolCallId: 'completed-call-1', outcome: 'success', content: '示例处理已完成。', durationLabel: '示例记录' },
          { id: 'completed-assistant-1', kind: 'assistant-message', content: '这是固定展示数据生成的示例回复。', createdAtLabel: '示例标记', isPartial: false },
        ],
      },
      {
        id: 'completed-history',
        title: '示例会话 B',
        collection: 'pinned',
        timeline: [
          { id: 'completed-history-user-1', kind: 'user-message', content: '请确认示例状态。', createdAtLabel: '示例标记' },
          { id: 'completed-history-assistant-1', kind: 'assistant-message', content: '示例状态已确认。', createdAtLabel: '示例标记', isPartial: false },
        ],
      },
      ...createSidebarCollectionConversations('completed'),
    ],
  },
  running: {
    id: 'running',
    name: '运行中',
    description: '展示运行状态与禁用编辑器。',
    runStatus: 'running',
    activeConversationId: 'running-main',
    composerMode: 'disabled_running',
    conversations: [
      {
        id: 'running-main',
        title: '示例运行会话',
        collection: 'pinned',
        timeline: [
          { id: 'running-user-1', kind: 'user-message', content: '请处理示例输入。', createdAtLabel: '示例标记' },
          { id: 'running-reasoning-1', kind: 'reasoning', title: '正在处理', content: '正在处理固定示例数据。', defaultExpanded: true, isActive: true },
          { id: 'running-notice-1', kind: 'status-notice', tone: 'running', title: '正在运行', description: '当前示例状态仍在运行。' },
        ],
      },
      ...createSidebarCollectionConversations('running'),
    ],
  },
  'waiting-approval': {
    id: 'waiting-approval',
    name: '等待批准',
    description: '展示等待批准状态与禁用编辑器。',
    runStatus: 'waiting_approval',
    activeConversationId: 'approval-main',
    composerMode: 'disabled_waiting_approval',
    conversations: [
      {
        id: 'approval-main',
        title: '示例批准会话',
        collection: 'pinned',
        timeline: [
          { id: 'approval-user-1', kind: 'user-message', content: '请确认示例操作。', createdAtLabel: '示例标记' },
          { id: 'approval-reasoning-1', kind: 'reasoning', title: '准备处理', content: '已生成固定的示例操作。', defaultExpanded: true, isActive: false },
          { id: 'approval-tool-call-1', kind: 'tool-call', toolCallId: 'approval-call-1', toolName: 'example_tool', summary: '等待示例批准', input: '{\n  "input": "示例值"\n}', status: 'waiting_approval', requiresApproval: true },
          { id: 'approval-notice-1', kind: 'status-notice', tone: 'waiting_approval', title: '等待批准', description: '批准或拒绝此工具调用后才能继续。' },
        ],
      },
      ...createSidebarCollectionConversations('waiting-approval'),
    ],
  },
  failed: {
    id: 'failed',
    name: '运行失败',
    description: '展示固定的失败状态与未完成回复。',
    runStatus: 'failed',
    activeConversationId: 'failed-main',
    composerMode: 'enabled',
    conversations: [
      {
        id: 'failed-main',
        title: '示例失败会话',
        collection: 'pinned',
        timeline: [
          { id: 'failed-user-1', kind: 'user-message', content: '请处理示例输入。', createdAtLabel: '示例标记' },
          { id: 'failed-reasoning-1', kind: 'reasoning', title: '处理已中止', content: '固定示例操作未能完成。', defaultExpanded: false, isActive: false },
          { id: 'failed-tool-call-1', kind: 'tool-call', toolCallId: 'failed-call-1', toolName: 'example_tool', summary: '处理示例输入', input: '{\n  "input": "示例值"\n}', status: 'failed', requiresApproval: false },
          { id: 'failed-tool-result-1', kind: 'tool-result', toolCallId: 'failed-call-1', outcome: 'failed', content: '示例处理失败。', durationLabel: '示例记录' },
          { id: 'failed-assistant-1', kind: 'assistant-message', content: '示例回复未完成。', createdAtLabel: '示例标记', isPartial: true },
          { id: 'failed-notice-1', kind: 'status-notice', tone: 'failed', title: '运行失败', description: '工具调用失败，已保留已产生内容。' },
        ],
      },
      ...createSidebarCollectionConversations('failed'),
    ],
  },
  cancelled: {
    id: 'cancelled',
    name: '已取消',
    description: '展示固定的取消状态与未完成回复。',
    runStatus: 'cancelled',
    activeConversationId: 'cancelled-main',
    composerMode: 'enabled',
    conversations: [
      {
        id: 'cancelled-main',
        title: '示例取消会话',
        collection: 'pinned',
        timeline: [
          { id: 'cancelled-user-1', kind: 'user-message', content: '请处理示例输入。', createdAtLabel: '示例标记' },
          { id: 'cancelled-reasoning-1', kind: 'reasoning', title: '处理已停止', content: '已保留部分固定示例数据。', defaultExpanded: false, isActive: false },
          { id: 'cancelled-assistant-1', kind: 'assistant-message', content: '示例回复未完成，', createdAtLabel: '示例标记', isPartial: true },
          { id: 'cancelled-notice-1', kind: 'status-notice', tone: 'cancelled', title: '运行已取消', description: '用户已停止本轮运行，已保留当前内容。' },
        ],
      },
      ...createSidebarCollectionConversations('cancelled'),
    ],
  },
};

export const scenarioList: readonly UiScenario[] = [
  scenarios.empty,
  scenarios.completed,
  scenarios.running,
  scenarios['waiting-approval'],
  scenarios.failed,
  scenarios.cancelled,
];
