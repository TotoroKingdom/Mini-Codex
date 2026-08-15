export const RUN_PRESENTATION_STATUSES = [
  'idle',
  'running',
  'waiting_approval',
  'completed',
  'failed',
  'cancelled',
] as const;

export type RunPresentationStatus = (typeof RUN_PRESENTATION_STATUSES)[number];

export const TIMELINE_ITEM_KINDS = [
  'user-message',
  'assistant-message',
  'reasoning',
  'tool-call',
  'tool-result',
  'status-notice',
] as const;

export type TimelineItemKind = (typeof TIMELINE_ITEM_KINDS)[number];

export const TOOL_PRESENTATION_STATUSES = [
  'requested',
  'waiting_approval',
  'running',
  'completed',
  'failed',
  'denied',
  'cancelled',
] as const;

export type ToolPresentationStatus = (typeof TOOL_PRESENTATION_STATUSES)[number];

export const TOOL_RESULT_OUTCOMES = ['success', 'failed', 'cancelled'] as const;

export type ToolResultOutcome = (typeof TOOL_RESULT_OUTCOMES)[number];

export const COMPOSER_MODES = [
  'enabled',
  'disabled_running',
  'disabled_waiting_approval',
] as const;

export type ComposerMode = (typeof COMPOSER_MODES)[number];

export const SCENARIO_IDS = [
  'empty',
  'completed',
  'running',
  'waiting-approval',
  'failed',
  'cancelled',
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

type TimelineItemBase<TKind extends TimelineItemKind> = {
  id: string;
  kind: TKind;
};

export type UserMessageTimelineItem = TimelineItemBase<'user-message'> & {
  content: string;
  createdAtLabel: string;
};

export type AssistantMessageTimelineItem = TimelineItemBase<'assistant-message'> & {
  content: string;
  createdAtLabel: string;
  isPartial: boolean;
};

export type ReasoningTimelineItem = TimelineItemBase<'reasoning'> & {
  title: string;
  content: string;
  defaultExpanded: boolean;
  isActive: boolean;
};

export type ToolCallTimelineItem = TimelineItemBase<'tool-call'> & {
  toolCallId: string;
  toolName: string;
  summary: string;
  input: string;
  status: ToolPresentationStatus;
  requiresApproval: boolean;
};

export type ToolResultTimelineItem = TimelineItemBase<'tool-result'> & {
  toolCallId: string;
  outcome: ToolResultOutcome;
  content: string;
  durationLabel: string;
};

export type StatusNoticeTone = Extract<
  RunPresentationStatus,
  'running' | 'waiting_approval' | 'failed' | 'cancelled'
>;

export type StatusNoticeTimelineItem = TimelineItemBase<'status-notice'> & {
  tone: StatusNoticeTone;
  title: string;
  description: string;
};

export type TimelineItem =
  | UserMessageTimelineItem
  | AssistantMessageTimelineItem
  | ReasoningTimelineItem
  | ToolCallTimelineItem
  | ToolResultTimelineItem
  | StatusNoticeTimelineItem;

export type ConversationCollection = 'pinned' | 'project' | 'recent';

export type ConversationFixture = {
  id: string;
  title: string;
  collection?: ConversationCollection;
  timeline: readonly TimelineItem[];
};

export type UiScenario = {
  id: ScenarioId;
  name: string;
  description: string;
  runStatus: RunPresentationStatus;
  conversations: readonly ConversationFixture[];
  activeConversationId: string | null;
  composerMode: ComposerMode;
};
