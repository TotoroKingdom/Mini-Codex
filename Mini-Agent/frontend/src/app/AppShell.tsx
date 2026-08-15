import { ApplicationTopBar } from '../components/shell/ApplicationTopBar';
import { Composer } from '../components/composer/Composer';
import { ConversationTimeline } from '../components/conversation/ConversationTimeline';
import { ConversationHeader } from '../components/shell/ConversationHeader';
import { Sidebar } from '../components/shell/Sidebar';
import type { UiIntentHandler } from '../presentation';
import { completedConversation } from './completedConversation';
import styles from './AppShell.module.css';

export type AppShellProps = {
  sidebarCollapsed?: boolean;
  title?: string;
  onIntent?: UiIntentHandler;
  onReasoningToggle?: (itemId: string) => void;
};

export function AppShell({
  sidebarCollapsed = false,
  title = '阅读@PROJECT.md@ARCHITECTURE.md@ROADMAP.md',
  onIntent,
  onReasoningToggle,
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
              <ConversationTimeline
                items={completedConversation}
                onIntent={onIntent}
                onReasoningToggle={onReasoningToggle}
              />
            </div>
          </main>
          <section aria-label="消息编辑器外壳" className={styles.composerSlot}>
            <Composer mode="enabled" onIntent={onIntent ?? (() => undefined)} />
          </section>
        </div>
      </div>
    </div>
  );
}
