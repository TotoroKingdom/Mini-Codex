import { Copy, Pencil } from 'lucide-react';
import type { UserMessageTimelineItem } from '../../presentation';
import styles from './UserMessage.module.css';

export type UserMessageProps = {
  item: UserMessageTimelineItem;
};

export function UserMessage({ item }: UserMessageProps) {
  return (
    <article aria-label="用户消息" className={styles.message}>
      <div className={styles.bubble}>{item.content}</div>
      <footer className={styles.metadata}>
        <time>{item.createdAtLabel}</time>
        <div className={styles.actions}>
          <button aria-label="复制用户消息" className={styles.iconButton} type="button">
            <Copy aria-hidden="true" size={16} strokeWidth={1.6} />
          </button>
          <button aria-label="编辑用户消息" className={styles.iconButton} type="button">
            <Pencil aria-hidden="true" size={16} strokeWidth={1.6} />
          </button>
        </div>
      </footer>
    </article>
  );
}
