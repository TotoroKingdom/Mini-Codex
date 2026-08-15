import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { scenarios, scenarioList } from '../../fixtures';
import type { UiIntent } from '../../presentation';
import { AcceptancePanel } from './AcceptancePanel';

const baseProps = {
  isOpen: true,
  scenarios: scenarioList,
  scenario: scenarios.completed,
  intent: null,
  onScenarioSelect: vi.fn(),
  onClose: vi.fn(),
};

describe('AcceptancePanel', () => {
  it('does not render when closed and does not occupy layout space', () => {
    const { container } = render(<AcceptancePanel {...baseProps} isOpen={false} />);

    expect(screen.queryByRole('dialog', { name: '验收面板' })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows six scenarios and reports the selected ScenarioId', async () => {
    const user = userEvent.setup();
    const onScenarioSelect = vi.fn();
    render(<AcceptancePanel {...baseProps} onScenarioSelect={onScenarioSelect} />);

    const switcher = screen.getByRole('combobox', { name: '选择场景' });
    expect(screen.getAllByRole('option')).toHaveLength(6);

    await user.selectOptions(switcher, 'waiting-approval');

    expect(onScenarioSelect).toHaveBeenCalledWith('waiting-approval');
    expect(screen.getByRole('heading', { name: '已完成' })).toBeInTheDocument();
    expect(screen.getByText(scenarios.completed.description)).toBeInTheDocument();
  });

  it.each([
    [{ type: 'composer.submit', content: '示例输入' }, 'composer.submit', '{"content":"示例输入"}'],
    [{ type: 'run.stop' }, 'run.stop', '{}'],
    [{ type: 'permission.approve', toolCallId: 'tool-1' }, 'permission.approve', '{"toolCallId":"tool-1"}'],
    [{ type: 'permission.deny', toolCallId: 'tool-1' }, 'permission.deny', '{"toolCallId":"tool-1"}'],
  ] as const satisfies readonly [UiIntent, string, string][])('announces %s', (intent, type, payload) => {
    render(<AcceptancePanel {...baseProps} intent={intent} />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText(type)).toBeInTheDocument();
    expect(screen.getByLabelText('界面意图参数')).toHaveTextContent(payload);
  });

  it('shows a clear empty Intent state and reports close', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AcceptancePanel {...baseProps} onClose={onClose} />);

    expect(screen.getByText('暂无界面意图')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭验收面板' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
