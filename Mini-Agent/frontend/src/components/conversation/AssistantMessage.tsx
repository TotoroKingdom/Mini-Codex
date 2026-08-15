import { Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { AssistantMessageTimelineItem } from '../../presentation';
import styles from './AssistantMessage.module.css';

export type AssistantMessageProps = {
  item: AssistantMessageTimelineItem;
  durationLabel?: string;
};

export function AssistantMessage({ item, durationLabel }: AssistantMessageProps) {
  return (
    <article aria-label="助手消息" className={styles.message} data-partial={item.isPartial}>
      <div className={styles.content}>{item.content}</div>
      <footer className={styles.metadata}>
        {item.isPartial && <span className={styles.partialStatus}>正在生成</span>}
        <time>{item.createdAtLabel}</time>
        {durationLabel && <span>{durationLabel}</span>}
        <div className={styles.actions}>
          <button aria-label="复制助手消息" className={styles.iconButton} type="button">
            <Copy aria-hidden="true" size={16} strokeWidth={1.6} />
          </button>
          <button aria-label="赞同助手消息" className={styles.iconButton} type="button">
            <ThumbsUp aria-hidden="true" size={16} strokeWidth={1.6} />
          </button>
          <button aria-label="不赞同助手消息" className={styles.iconButton} type="button">
            <ThumbsDown aria-hidden="true" size={16} strokeWidth={1.6} />
          </button>
        </div>
      </footer>
    </article>
  );
}
