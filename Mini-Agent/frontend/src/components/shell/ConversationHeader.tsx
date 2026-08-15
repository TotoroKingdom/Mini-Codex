import {
  ChevronDown,
  Columns2,
  Folder,
  LayoutList,
  MoreHorizontal,
  PanelRight,
  SlidersHorizontal,
} from 'lucide-react';
import type { RunPresentationStatus } from '../../presentation';
import styles from './ConversationHeader.module.css';

export type ConversationHeaderProps = {
  title: string;
  runStatus?: RunPresentationStatus;
  onOverflowClick?: () => void;
};

const controls = [
  { label: '选择工作区', icon: <ChevronDown aria-hidden="true" size={16} /> },
  { label: '会话控制', icon: <SlidersHorizontal aria-hidden="true" size={17} /> },
  { label: '列表视图', icon: <LayoutList aria-hidden="true" size={17} /> },
  { label: '分栏视图', icon: <Columns2 aria-hidden="true" size={17} /> },
  { label: '显示右侧面板', icon: <PanelRight aria-hidden="true" size={17} /> },
];

export function ConversationHeader({ title, runStatus = 'completed', onOverflowClick }: ConversationHeaderProps) {
  return (
    <header aria-label="会话标题栏" className={styles.header} data-run-status={runStatus}>
      <div className={styles.titleArea}>
        <Folder aria-hidden="true" className={styles.folderIcon} size={19} strokeWidth={1.7} />
        <span className={styles.title} title={title}>{title}</span>
        <button aria-label="更多会话选项" className={styles.iconButton} onClick={onOverflowClick} type="button">
          <MoreHorizontal aria-hidden="true" size={19} />
        </button>
      </div>
      <div aria-label="会话视图控制" className={styles.controls}>
        {controls.map(({ label, icon }) => (
          <button aria-label={label} className={styles.iconButton} key={label} type="button">
            {icon}
          </button>
        ))}
      </div>
    </header>
  );
}
