import { CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import type { ToolResultTimelineItem } from '../../presentation';
import styles from './ToolResult.module.css';

export type ToolResultProps = {
  item: ToolResultTimelineItem;
};

const outcomeLabels = {
  success: '执行成功',
  failed: '执行失败',
  cancelled: '执行已取消',
} as const;

function OutcomeIcon({ outcome }: Pick<ToolResultTimelineItem, 'outcome'>) {
  if (outcome === 'success') return <CircleCheck aria-hidden="true" size={16} />;
  if (outcome === 'failed') return <CircleAlert aria-hidden="true" size={16} />;
  return <CircleX aria-hidden="true" size={16} />;
}

export function ToolResult({ item }: ToolResultProps) {
  return (
    <article aria-label="工具结果" className={styles.result} data-outcome={item.outcome}>
      <header className={styles.header}>
        <span className={styles.outcome}>
          <OutcomeIcon outcome={item.outcome} />
          {outcomeLabels[item.outcome]}
        </span>
        <span>{item.durationLabel}</span>
      </header>
      <pre aria-label="工具输出" className={styles.content}>{item.content}</pre>
    </article>
  );
}
