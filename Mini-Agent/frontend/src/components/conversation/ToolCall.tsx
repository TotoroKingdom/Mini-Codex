import { Check, CircleAlert, CircleCheck, CircleX, Clock3, LoaderCircle, Wrench, X } from 'lucide-react';
import type { ToolCallTimelineItem, UiIntentHandler } from '../../presentation';
import styles from './ToolCall.module.css';

export type ToolCallProps = {
  item: ToolCallTimelineItem;
  onIntent?: UiIntentHandler;
};

const statusLabels = {
  requested: '已请求',
  waiting_approval: '等待批准',
  running: '正在运行',
  completed: '已完成',
  failed: '执行失败',
  denied: '已拒绝',
  cancelled: '已取消',
} as const;

function StatusIcon({ status }: Pick<ToolCallTimelineItem, 'status'>) {
  if (status === 'completed') return <CircleCheck aria-hidden="true" size={16} />;
  if (status === 'failed') return <CircleAlert aria-hidden="true" size={16} />;
  if (status === 'denied' || status === 'cancelled') return <CircleX aria-hidden="true" size={16} />;
  if (status === 'running') return <LoaderCircle aria-hidden="true" className={styles.runningIcon} size={16} />;
  return <Clock3 aria-hidden="true" size={16} />;
}

export function ToolCall({ item, onIntent }: ToolCallProps) {
  const needsDecision = item.requiresApproval && item.status === 'waiting_approval';

  return (
    <article aria-label={`工具调用：${item.toolName}`} className={styles.toolCall} data-status={item.status}>
      <header className={styles.header}>
        <span className={styles.toolIcon}><Wrench aria-hidden="true" size={17} strokeWidth={1.7} /></span>
        <div className={styles.heading}>
          <strong>{item.toolName}</strong>
          <span>{item.summary}</span>
        </div>
        <span className={styles.status}>
          <StatusIcon status={item.status} />
          {statusLabels[item.status]}
        </span>
      </header>
      <pre aria-label="工具输入" className={styles.input}>{item.input}</pre>
      {needsDecision && (
        <div className={styles.approval}>
          <p>此操作需要你的批准。</p>
          <div className={styles.approvalActions}>
            <button
              aria-label={`批准工具调用 ${item.toolName}`}
              className={styles.approveButton}
              onClick={() => onIntent?.({ type: 'permission.approve', toolCallId: item.toolCallId })}
              type="button"
            >
              <Check aria-hidden="true" size={16} /> 批准
            </button>
            <button
              aria-label={`拒绝工具调用 ${item.toolName}`}
              className={styles.denyButton}
              onClick={() => onIntent?.({ type: 'permission.deny', toolCallId: item.toolCallId })}
              type="button"
            >
              <X aria-hidden="true" size={16} /> 拒绝
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
