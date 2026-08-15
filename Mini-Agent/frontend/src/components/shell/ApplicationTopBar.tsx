import {
  ArrowLeft,
  ArrowRight,
  Minus,
  PanelLeft,
  Square,
  X,
} from 'lucide-react';
import styles from './ApplicationTopBar.module.css';

type IconButtonProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export type ApplicationTopBarProps = {
  onSidebarToggle?: () => void;
};

function IconButton({ label, children, className }: IconButtonProps) {
  return (
    <button aria-label={label} className={`${styles.iconButton} ${className ?? ''}`} type="button">
      {children}
    </button>
  );
}

export function ApplicationTopBar({ onSidebarToggle }: ApplicationTopBarProps) {
  return (
    <header aria-label="应用顶部栏" className={styles.topBar}>
      <div className={styles.navigation}>
        <button aria-label="切换侧边栏" className={styles.iconButton} onClick={onSidebarToggle} type="button">
          <PanelLeft aria-hidden="true" size={18} strokeWidth={1.6} />
        </button>
        <IconButton label="后退">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.6} />
        </IconButton>
        <IconButton label="前进" className={styles.mutedControl}>
          <ArrowRight aria-hidden="true" size={18} strokeWidth={1.6} />
        </IconButton>
        <nav aria-label="应用菜单" className={styles.menuBar}>
          {['文件', '编辑', '视图', '帮助'].map((item) => (
            <button className={styles.menuButton} key={item} type="button">
              {item}
            </button>
          ))}
        </nav>
      </div>
      <div aria-label="窗口控制" className={styles.windowControls}>
        <IconButton label="最小化窗口">
          <Minus aria-hidden="true" size={16} strokeWidth={1.4} />
        </IconButton>
        <IconButton label="最大化窗口">
          <Square aria-hidden="true" size={14} strokeWidth={1.4} />
        </IconButton>
        <IconButton label="关闭窗口" className={styles.closeButton}>
          <X aria-hidden="true" size={17} strokeWidth={1.4} />
        </IconButton>
      </div>
    </header>
  );
}
