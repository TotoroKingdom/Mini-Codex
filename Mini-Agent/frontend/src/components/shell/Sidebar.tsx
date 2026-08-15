import {
  Bell,
  Bot,
  ChevronDown,
  Clock3,
  Folder,
  GitPullRequest,
  Grid2X2,
  HelpCircle,
  MoreHorizontal,
  PanelTop,
  Pin,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from 'lucide-react';
import styles from './Sidebar.module.css';

export type SidebarProps = {
  collapsed?: boolean;
};

const primaryActions = [
  { label: '新对话', icon: <Plus aria-hidden="true" /> },
  { label: '拉取请求', icon: <GitPullRequest aria-hidden="true" /> },
  { label: '站点', icon: <Grid2X2 aria-hidden="true" /> },
  { label: '已安排', icon: <Clock3 aria-hidden="true" /> },
  { label: '插件', icon: <Sparkles aria-hidden="true" /> },
];

const collections = [
  {
    label: '置顶',
    icon: <Pin aria-hidden="true" />,
    items: ['示例会话 A', '当前示例会话', '示例会话 B', '示例会话 C'],
  },
  {
    label: '项目',
    icon: <Folder aria-hidden="true" />,
    items: ['项目示例 A', '项目示例 B', '项目示例 C'],
  },
  {
    label: '最近',
    icon: <Clock3 aria-hidden="true" />,
    items: ['示例记录 A', '示例记录 B', '示例记录 C', '示例记录 D', '示例记录 E'],
  },
];

export function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      aria-label="侧边栏"
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded}`}
      data-collapsed={collapsed}
    >
      <div className={styles.brandRow}>
        <button aria-label="Codex 工作区" className={styles.brandButton} type="button">
          <Bot aria-hidden="true" size={22} strokeWidth={1.8} />
          {!collapsed && <><span>Codex</span><ChevronDown aria-hidden="true" size={15} /></>}
        </button>
        {!collapsed && (
          <div className={styles.brandTools}>
            <button aria-label="搜索" className={styles.iconButton} type="button"><Search aria-hidden="true" /></button>
            <button aria-label="通知" className={styles.iconButton} type="button"><Bell aria-hidden="true" /></button>
          </div>
        )}
      </div>

      <nav aria-label="主要操作" className={styles.primaryActions}>
        {primaryActions.map(({ label, icon }) => (
          <button aria-label={label} className={styles.actionButton} key={label} type="button">
            {icon}
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className={styles.collectionScroll} data-scroll-region="sidebar">
          {collections.map(({ label, icon, items }) => (
            <section aria-labelledby={`collection-${label}`} className={styles.collection} key={label}>
              <h2 id={`collection-${label}`}>{label}</h2>
              <ul>
                {items.map((item, index) => {
                  const isCurrent = label === '置顶' && index === 1;
                  return (
                    <li key={item}>
                      <button
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`${styles.conversation} ${isCurrent ? styles.current : ''}`}
                        type="button"
                      >
                        {index === 0 && label !== '最近' ? icon : <span className={styles.itemSpacer} aria-hidden="true" />}
                        <span>{item}</span>
                        {isCurrent && <MoreHorizontal aria-hidden="true" className={styles.itemMore} size={16} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <footer className={styles.footer}>
        <button aria-label="打开用户菜单" className={styles.userButton} type="button">
          <span aria-hidden="true" className={styles.avatar}>T</span>
          {!collapsed && <span className={styles.userName}>用户</span>}
        </button>
        {!collapsed && <button aria-label="侧边栏设置" className={styles.iconButton} type="button"><Settings2 aria-hidden="true" /></button>}
      </footer>
    </aside>
  );
}
