import { ApplicationTopBar } from '../components/shell/ApplicationTopBar';
import { ComposerShell } from '../components/shell/ComposerShell';
import { ConversationHeader } from '../components/shell/ConversationHeader';
import { Sidebar } from '../components/shell/Sidebar';
import styles from './AppShell.module.css';

export type AppShellProps = {
  sidebarCollapsed?: boolean;
  title?: string;
};

export function AppShell({
  sidebarCollapsed = false,
  title = '阅读@PROJECT.md@ARCHITECTURE.md@ROADMAP.md',
}: AppShellProps) {
  return (
    <div className={styles.appShell} data-sidebar-collapsed={sidebarCollapsed}>
      <ApplicationTopBar />
      <div className={styles.workspace}>
        <Sidebar collapsed={sidebarCollapsed} />
        <div className={styles.conversationPane}>
          <ConversationHeader title={title} />
          <main aria-label="会话内容" className={styles.mainScroll}>
            <div aria-label="时间线插槽" className={styles.timelineSlot}>
              <p className={styles.emptyState}>选择一个会话开始工作</p>
            </div>
          </main>
          <ComposerShell />
        </div>
      </div>
    </div>
  );
}
