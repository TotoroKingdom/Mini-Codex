import type { TimelineItem } from '../presentation';

export const completedConversation: readonly TimelineItem[] = [
  {
    id: 'completed-user-1',
    kind: 'user-message',
    content: '请阅读 @PROJECT.md、@ARCHITECTURE.md 和 @ROADMAP.md，并整理当前 UI 原型需要覆盖的区域。',
    createdAtLabel: '18:38',
  },
  {
    id: 'completed-reasoning-1',
    kind: 'reasoning',
    title: '已完成分析',
    content: '已核对项目目标、架构边界和路线图。当前原型需要优先覆盖 Sidebar、Conversation、Tool 状态与 Composer，并保持桌面布局独立滚动。',
    defaultExpanded: false,
    isActive: false,
  },
  {
    id: 'completed-tool-call-1',
    kind: 'tool-call',
    toolCallId: 'read-spec-1',
    toolName: 'read_file',
    summary: '读取 M01 UI SPEC',
    input: '{\n  "path": "docs/features/M01-ui-foundation/SPEC.md"\n}',
    status: 'completed',
    requiresApproval: false,
  },
  {
    id: 'completed-tool-result-1',
    kind: 'tool-result',
    toolCallId: 'read-spec-1',
    outcome: 'success',
    content: '已读取 SPEC：M01 仅包含静态 UI Prototype，不连接 Backend、网络或持久化。',
    durationLabel: '耗时 34 秒',
  },
  {
    id: 'completed-assistant-1',
    kind: 'assistant-message',
    content: '已完成梳理：主界面会保留顶部栏、Sidebar、居中 Timeline 和底部 Composer，并使用固定展示数据呈现完整的 Agent 执行过程。',
    createdAtLabel: '18:39',
    isPartial: false,
  },
];
