import { ApplicationTopBar } from '../components/shell/ApplicationTopBar';
import { AcceptancePanel } from '../components/acceptance/AcceptancePanel';
import { Composer } from '../components/composer/Composer';
import { ConversationTimeline } from '../components/conversation/ConversationTimeline';
import { EmptyConversation } from '../components/conversation/EmptyConversation';
import { ConversationHeader } from '../components/shell/ConversationHeader';
import { Sidebar } from '../components/shell/Sidebar';
import { scenarioList, scenarios } from '../fixtures';
import type { ScenarioId, UiIntent, UiIntentHandler, UiScenario } from '../presentation';
import type { ConversationFixture } from '../presentation/types';
import styles from './AppShell.module.css';

export type AppShellProps = {
  scenario?: UiScenario;
  activeConversation?: ConversationFixture | null;
  sidebarCollapsed?: boolean;
  expandedReasoningIds?: readonly string[];
  composerResetKey?: number;
  isAcceptancePanelOpen?: boolean;
  lastIntent?: UiIntent | null;
  onIntent?: UiIntentHandler;
  onScenarioSelect?: (scenarioId: ScenarioId) => void;
  onConversationSelect?: (conversationId: string) => void;
  onReasoningToggle?: (reasoningId: string) => void;
  onSidebarToggle?: () => void;
  onToggleAcceptancePanel?: () => void;
};

export function AppShell({
  scenario = scenarios.completed,
  activeConversation = scenarios.completed.conversations[0],
  sidebarCollapsed = false,
  expandedReasoningIds = [],
  composerResetKey = 0,
  isAcceptancePanelOpen = false,
  lastIntent = null,
  onIntent,
  onScenarioSelect,
  onConversationSelect,
  onReasoningToggle,
  onSidebarToggle,
  onToggleAcceptancePanel,
}: AppShellProps) {
  return (
    <div className={styles.appShell} data-sidebar-collapsed={sidebarCollapsed}>
      <ApplicationTopBar onSidebarToggle={onSidebarToggle} />
      <div className={styles.workspace}>
        <Sidebar
          activeConversationId={activeConversation?.id ?? null}
          collapsed={sidebarCollapsed}
          conversations={scenario.conversations}
          onConversationSelect={onConversationSelect}
        />
        <div className={styles.conversationPane}>
          <ConversationHeader
            onOverflowClick={onToggleAcceptancePanel}
            runStatus={scenario.runStatus}
            title={activeConversation?.title ?? scenario.name}
          />
          <main aria-label="会话内容" className={styles.mainScroll}>
            <div aria-label="时间线插槽" className={styles.timelineSlot}>
              {activeConversation ? (
                <ConversationTimeline
                  items={activeConversation.timeline}
                  expandedReasoningIds={expandedReasoningIds}
                  onIntent={onIntent}
                  onReasoningToggle={onReasoningToggle}
                />
              ) : <EmptyConversation />}
            </div>
          </main>
          <section aria-label="消息编辑器外壳" className={styles.composerSlot}>
            <Composer key={composerResetKey} mode={scenario.composerMode} onIntent={onIntent ?? (() => undefined)} resetKey={composerResetKey} />
          </section>
        </div>
      </div>
      <AcceptancePanel
        intent={lastIntent}
        isOpen={isAcceptancePanelOpen}
        onClose={onToggleAcceptancePanel ?? (() => undefined)}
        onScenarioSelect={onScenarioSelect ?? (() => undefined)}
        scenario={scenario}
        scenarios={scenarioList}
      />
    </div>
  );
}
