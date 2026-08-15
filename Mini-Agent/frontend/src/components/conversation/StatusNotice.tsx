import { CircleAlert, CircleCheck, CirclePause, LoaderCircle } from 'lucide-react';
import type { StatusNoticeTimelineItem } from '../../presentation';
import styles from './StatusNotice.module.css';

export type StatusNoticeProps = {
  item: StatusNoticeTimelineItem;
};

function ToneIcon({ tone }: Pick<StatusNoticeTimelineItem, 'tone'>) {
  if (tone === 'running') return <LoaderCircle aria-hidden="true" className={styles.runningIcon} size={18} />;
  if (tone === 'waiting_approval') return <CirclePause aria-hidden="true" size={18} />;
  if (tone === 'failed') return <CircleAlert aria-hidden="true" size={18} />;
  return <CircleCheck aria-hidden="true" size={18} />;
}

export function StatusNotice({ item }: StatusNoticeProps) {
  return (
    <section aria-label={`运行状态：${item.title}`} className={styles.notice} data-tone={item.tone} role="status">
      <ToneIcon tone={item.tone} />
      <div>
        <strong>{item.title}</strong>
        <p>{item.description}</p>
      </div>
    </section>
  );
}
