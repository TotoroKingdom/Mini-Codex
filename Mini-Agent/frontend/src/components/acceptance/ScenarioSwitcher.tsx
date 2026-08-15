import type { ScenarioId, UiScenario } from '../../presentation';

export type ScenarioSwitcherProps = {
  scenarios: readonly UiScenario[];
  selectedScenarioId: ScenarioId;
  onScenarioSelect: (scenarioId: ScenarioId) => void;
};

export function ScenarioSwitcher({
  scenarios,
  selectedScenarioId,
  onScenarioSelect,
}: ScenarioSwitcherProps) {
  return (
    <div>
      <label htmlFor="scenario-switcher">选择场景</label>
      <select
        aria-label="选择场景"
        id="scenario-switcher"
        onChange={(event) => onScenarioSelect(event.target.value as ScenarioId)}
        value={selectedScenarioId}
      >
        {scenarios.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
        ))}
      </select>
    </div>
  );
}
