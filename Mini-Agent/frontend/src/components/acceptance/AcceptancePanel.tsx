import type { ScenarioId, UiIntent, UiScenario } from '../../presentation';
import { IntentMonitor } from './IntentMonitor';
import { ScenarioSwitcher } from './ScenarioSwitcher';
import styles from './AcceptancePanel.module.css';

export type AcceptancePanelProps = {
  isOpen: boolean;
  scenarios: readonly UiScenario[];
  scenario: UiScenario;
  intent: UiIntent | null;
  onScenarioSelect: (scenarioId: ScenarioId) => void;
  onClose: () => void;
};

export function AcceptancePanel({
  isOpen,
  scenarios,
  scenario,
  intent,
  onScenarioSelect,
  onClose,
}: AcceptancePanelProps) {
  if (!isOpen) return null;

  return (
    <aside aria-label="验收面板" className={styles.panel} role="dialog">
      <header className={styles.header}>
        <h1>验收面板</h1>
        <button aria-label="关闭验收面板" className={styles.closeButton} onClick={onClose} type="button">关闭</button>
      </header>
      <div className={styles.content}>
        <ScenarioSwitcher
          onScenarioSelect={onScenarioSelect}
          scenarios={scenarios}
          selectedScenarioId={scenario.id}
        />
        <section aria-label="当前场景">
          <h2>{scenario.name}</h2>
          <p>{scenario.description}</p>
        </section>
        <IntentMonitor intent={intent} />
      </div>
    </aside>
  );
}
