import type { ScenarioId, UiScenario } from '../presentation/types';

export const DEFAULT_SCENARIO_ID: ScenarioId = 'completed';

export const scenarios: Readonly<Record<ScenarioId, UiScenario>> = {
  empty: {
    id: 'empty',
    name: '空会话',
    description: '当前没有活动会话，可以从空白状态开始新的工作。',
    runStatus: 'idle',
    conversations: [],
    activeConversationId: null,
    composerMode: 'enabled',
  },
  completed: {
    id: 'completed',
    name: '已完成',
    description: '展示一轮完整的用户请求、推理、工具调用、工具结果与最终回复。',
    runStatus: 'completed',
    activeConversationId: 'completed-main',
    composerMode: 'enabled',
    conversations: [
      {
        id: 'completed-main',
        title: '阅读项目文档并整理 UI 范围',
        timeline: [
          { id: 'completed-user-1', kind: 'user-message', content: '请阅读项目文档，并整理当前 UI 原型需要覆盖的区域。', createdAtLabel: '18:38' },
          { id: 'completed-reasoning-1', kind: 'reasoning', title: '已完成分析', content: '已核对项目目标、架构边界和路线图，优先覆盖 Sidebar、Conversation、Tool 状态与 Composer。', defaultExpanded: false, isActive: false },
          { id: 'completed-tool-call-1', kind: 'tool-call', toolCallId: 'completed-call-1', toolName: 'read_file', summary: '读取 M01 UI SPEC', input: '{\n  "path": "docs/features/M01-ui-foundation/SPEC.md"\n}', status: 'completed', requiresApproval: false },
          { id: 'completed-tool-result-1', kind: 'tool-result', toolCallId: 'completed-call-1', outcome: 'success', content: '已读取 SPEC：M01 仅包含静态 UI Prototype，不连接 Backend、网络或持久化。', durationLabel: '耗时 34 秒' },
          { id: 'completed-assistant-1', kind: 'assistant-message', content: '已完成梳理：主界面保留顶部栏、Sidebar、居中 Timeline 与底部 Composer。', createdAtLabel: '18:39', isPartial: false },
        ],
      },
      {
        id: 'completed-history',
        title: '上一轮界面检查',
        timeline: [
          { id: 'completed-history-user-1', kind: 'user-message', content: '请确认页面是否只使用浅色主题。', createdAtLabel: '17:42' },
          { id: 'completed-history-assistant-1', kind: 'assistant-message', content: '已确认，本 Milestone 仅实现浅色桌面 UI。', createdAtLabel: '17:43', isPartial: false },
        ],
      },
    ],
  },
  running: {
    id: 'running',
    name: '运行中',
    description: '展示正在推理的 Agent，编辑器被禁用且可以停止运行。',
    runStatus: 'running',
    activeConversationId: 'running-main',
    composerMode: 'disabled_running',
    conversations: [
      {
        id: 'running-main',
        title: '分析当前界面结构',
        timeline: [
          { id: 'running-user-1', kind: 'user-message', content: '请分析当前界面结构并给出改进建议。', createdAtLabel: '18:40' },
          { id: 'running-reasoning-1', kind: 'reasoning', title: '正在分析界面结构', content: '正在检查布局、间距、排版和可访问性状态。', defaultExpanded: true, isActive: true },
          { id: 'running-notice-1', kind: 'status-notice', tone: 'running', title: '正在运行', description: 'Agent 正在生成分析结果。' },
        ],
      },
    ],
  },
  'waiting-approval': {
    id: 'waiting-approval',
    name: '等待批准',
    description: '展示需要用户批准的工具调用，编辑器被禁用且可以停止运行。',
    runStatus: 'waiting_approval',
    activeConversationId: 'approval-main',
    composerMode: 'disabled_waiting_approval',
    conversations: [
      {
        id: 'approval-main',
        title: '准备修改界面样式',
        timeline: [
          { id: 'approval-user-1', kind: 'user-message', content: '请把 Composer 的圆角调整得更接近参考图。', createdAtLabel: '18:42' },
          { id: 'approval-reasoning-1', kind: 'reasoning', title: '已生成修改方案', content: '准备提交一个仅调整 Composer 样式的 Patch。', defaultExpanded: true, isActive: false },
          { id: 'approval-tool-call-1', kind: 'tool-call', toolCallId: 'approval-call-1', toolName: 'apply_patch', summary: '调整 Composer 圆角', input: '{\n  "patch": "*** Update File: Composer.module.css"\n}', status: 'waiting_approval', requiresApproval: true },
          { id: 'approval-notice-1', kind: 'status-notice', tone: 'waiting_approval', title: '等待批准', description: '批准或拒绝此工具调用后才能继续。' },
        ],
      },
    ],
  },
  failed: {
    id: 'failed',
    name: '运行失败',
    description: '保留已产生的过程，并明确展示工具失败与未完成回复。',
    runStatus: 'failed',
    activeConversationId: 'failed-main',
    composerMode: 'enabled',
    conversations: [
      {
        id: 'failed-main',
        title: '读取不存在的文件',
        timeline: [
          { id: 'failed-user-1', kind: 'user-message', content: '请读取 docs/missing.md 的内容。', createdAtLabel: '18:44' },
          { id: 'failed-reasoning-1', kind: 'reasoning', title: '已完成路径检查', content: '正在尝试读取目标文件。', defaultExpanded: false, isActive: false },
          { id: 'failed-tool-call-1', kind: 'tool-call', toolCallId: 'failed-call-1', toolName: 'read_file', summary: '读取 docs/missing.md', input: '{\n  "path": "docs/missing.md"\n}', status: 'failed', requiresApproval: false },
          { id: 'failed-tool-result-1', kind: 'tool-result', toolCallId: 'failed-call-1', outcome: 'failed', content: '文件不存在：docs/missing.md', durationLabel: '耗时 1 秒' },
          { id: 'failed-assistant-1', kind: 'assistant-message', content: '读取文件时遇到错误，正在停止本轮回复。', createdAtLabel: '18:44', isPartial: true },
          { id: 'failed-notice-1', kind: 'status-notice', tone: 'failed', title: '运行失败', description: '工具调用失败，已保留已产生内容。' },
        ],
      },
    ],
  },
  cancelled: {
    id: 'cancelled',
    name: '已取消',
    description: '展示用户取消后的已产生过程和未完成回复。',
    runStatus: 'cancelled',
    activeConversationId: 'cancelled-main',
    composerMode: 'enabled',
    conversations: [
      {
        id: 'cancelled-main',
        title: '生成项目概览',
        timeline: [
          { id: 'cancelled-user-1', kind: 'user-message', content: '请生成当前项目的完整概览。', createdAtLabel: '18:46' },
          { id: 'cancelled-reasoning-1', kind: 'reasoning', title: '已停止推理', content: '已收集部分项目结构信息。', defaultExpanded: false, isActive: false },
          { id: 'cancelled-assistant-1', kind: 'assistant-message', content: '项目目前包含 UI Layer、Agent Core 与 Harness Runtime，', createdAtLabel: '18:46', isPartial: true },
          { id: 'cancelled-notice-1', kind: 'status-notice', tone: 'cancelled', title: '运行已取消', description: '用户已停止本轮运行，已保留当前内容。' },
        ],
      },
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
