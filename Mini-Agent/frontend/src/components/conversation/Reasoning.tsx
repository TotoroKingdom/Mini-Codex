import { ChevronDown, CircleCheck, LoaderCircle } from 'lucide-react';
import type { ReasoningTimelineItem } from '../../presentation';
import styles from './Reasoning.module.css';

export type ReasoningProps = {
  item: ReasoningTimelineItem;
  expanded: boolean;
  isActive: boolean;
  onToggle: () => void;
};

export function Reasoning({ item, expanded, isActive, onToggle }: ReasoningProps) {
  const contentId = `reasoning-content-${item.id}`;
  const stateLabel = isActive ? '正在推理' : '推理完成';

  return (
    <section aria-label="推理过程" className={styles.reasoning} data-active={isActive}>
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        aria-label={`${expanded ? '收起' : '展开'}推理过程`}
        className={styles.toggle}
        onClick={onToggle}
        type="button"
      >
        {isActive ? (
          <LoaderCircle aria-hidden="true" className={styles.activeIcon} size={17} strokeWidth={1.7} />
        ) : (
          <CircleCheck aria-hidden="true" size={17} strokeWidth={1.7} />
        )}
        <span className={styles.heading}>{item.title}</span>
        <span className={styles.status}>{stateLabel}</span>
        <ChevronDown aria-hidden="true" className={`${styles.chevron} ${expanded ? styles.expanded : ''}`} size={18} />
      </button>
      <div className={styles.content} hidden={!expanded} id={contentId}>
        {item.content}
      </div>
    </section>
  );
}
