import type { TimelineItem, UiIntentHandler } from '../../presentation';
import { AssistantMessage } from './AssistantMessage';
import { Reasoning } from './Reasoning';
import { StatusNotice } from './StatusNotice';
import { ToolCall } from './ToolCall';
import { ToolResult } from './ToolResult';
import { UserMessage } from './UserMessage';
import styles from './ConversationTimeline.module.css';

export type ConversationTimelineProps = {
  items: readonly TimelineItem[];
  reasoningExpanded?: Readonly<Record<string, boolean>>;
  expandedReasoningIds?: readonly string[];
  onReasoningToggle?: (itemId: string) => void;
  onIntent?: UiIntentHandler;
};

export function ConversationTimeline({
  items,
  reasoningExpanded,
  expandedReasoningIds,
  onReasoningToggle,
  onIntent,
}: ConversationTimelineProps) {
  return (
    <ol aria-label="会话时间线" className={styles.timeline}>
      {items.map((item) => (
        <li className={styles.item} data-kind={item.kind} key={item.id}>
          {item.kind === 'user-message' && <UserMessage item={item} />}
          {item.kind === 'assistant-message' && <AssistantMessage item={item} />}
          {item.kind === 'reasoning' && (
            <Reasoning
              expanded={expandedReasoningIds
                ? expandedReasoningIds.includes(item.id)
                : reasoningExpanded?.[item.id] ?? item.defaultExpanded}
              isActive={item.isActive}
              item={item}
              onToggle={() => onReasoningToggle?.(item.id)}
            />
          )}
          {item.kind === 'tool-call' && <ToolCall item={item} onIntent={onIntent} />}
          {item.kind === 'tool-result' && <ToolResult item={item} />}
          {item.kind === 'status-notice' && <StatusNotice item={item} />}
        </li>
      ))}
    </ol>
  );
}
