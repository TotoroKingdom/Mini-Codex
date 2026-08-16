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
  SquarePen,
  Sparkles,
} from 'lucide-react';
import type { ConversationFixture } from '../../presentation/types';
import { BackendConnectionStatus } from './BackendConnectionStatus';
import type { BackendConnectionStatusValue } from './BackendConnectionStatus';
import styles from './Sidebar.module.css';

export type SidebarProps = {
  collapsed?: boolean;
  conversations?: readonly ConversationFixture[];
  activeConversationId?: string | null;
  backendConnectionStatus?: BackendConnectionStatusValue;
  onConversationSelect?: (conversationId: string) => void;
  onBackendConnectionRetry?: () => void;
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
    collection: 'pinned',
    icon: <Pin aria-hidden="true" />,
  },
  {
    label: '项目',
    collection: 'project',
    icon: <Folder aria-hidden="true" />,
  },
  {
    label: '最近',
    collection: 'recent',
    icon: <Clock3 aria-hidden="true" />,
  },
] as const;

const fallbackConversations: readonly ConversationFixture[] = [
  { id: 'fallback-current', title: '当前示例会话', timeline: [] },
];

export function Sidebar({
  collapsed = false,
  conversations = fallbackConversations,
  activeConversationId = conversations[0]?.id ?? null,
  backendConnectionStatus = 'checking',
  onConversationSelect,
  onBackendConnectionRetry,
}: SidebarProps) {
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
          {collections.map(({ label, collection, icon }) => {
            const collectionConversations = conversations.filter(
              (conversation) => (conversation.collection ?? 'pinned') === collection,
            );
            const hasHeaderActions = collection !== 'pinned';

            return (
            <section aria-labelledby={`collection-${label}`} className={styles.collection} key={label}>
              <div className={styles.collectionHeader}>
                <h2 id={`collection-${label}`}>{label}</h2>
                {hasHeaderActions && (
                  <div className={styles.collectionActions}>
                    <button aria-label={`${label}更多操作`} className={styles.collectionAction} type="button">
                      <MoreHorizontal aria-hidden="true" size={16} />
                    </button>
                    <button aria-label={label === '项目' ? '新建项目' : '编辑最近分组'} className={styles.collectionAction} type="button">
                      {label === '项目' ? <Plus aria-hidden="true" size={16} /> : <SquarePen aria-hidden="true" size={15} />}
                    </button>
                  </div>
                )}
              </div>
              <ul>
                {collectionConversations.map((conversation, index) => {
                  const isCurrent = conversation.id === activeConversationId;
                  return (
                    <li className={styles.conversationItem} key={conversation.id}>
                      <button
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`${styles.conversation} ${isCurrent ? styles.current : ''}`}
                        onClick={() => onConversationSelect?.(conversation.id)}
                        type="button"
                      >
                        {index === 0 && collection !== 'recent' ? icon : <span className={styles.itemSpacer} aria-hidden="true" />}
                        <span>{conversation.title}</span>
                      </button>
                      <button aria-label={`打开${conversation.title}操作菜单`} className={styles.conversationMore} type="button">
                        <MoreHorizontal aria-hidden="true" size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
            );
          })}
        </div>
      )}

      <footer className={styles.footer}>
        <BackendConnectionStatus
          collapsed={collapsed}
          onRetry={onBackendConnectionRetry ?? (() => undefined)}
          status={backendConnectionStatus}
        />
        <div className={styles.footerUserActions}>
          <button aria-label="打开用户菜单" className={styles.userButton} type="button">
            <span aria-hidden="true" className={styles.avatar}>T</span>
            {!collapsed && <span className={styles.userName}>用户</span>}
          </button>
          {!collapsed && <button aria-label="侧边栏设置" className={styles.iconButton} type="button"><Settings2 aria-hidden="true" /></button>}
        </div>
      </footer>
    </aside>
  );
}
