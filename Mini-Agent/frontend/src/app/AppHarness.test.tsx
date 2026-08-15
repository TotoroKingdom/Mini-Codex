import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { scenarios } from '../fixtures';

function header() {
  return screen.getByRole('banner', { name: '会话标题栏' });
}

async function openAcceptancePanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '更多会话选项' }));
  return screen.getByRole('dialog', { name: '验收面板' });
}

describe('App Harness', () => {
  it('starts in the completed Scenario with the Acceptance Panel closed', () => {
    render(<App />);

    expect(screen.queryByRole('dialog', { name: '验收面板' })).not.toBeInTheDocument();
    expect(header()).toHaveAttribute('data-run-status', 'completed');
    expect(within(screen.getByRole('list', { name: '会话时间线' })).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('form', { name: '消息编辑器' })).toHaveAttribute('data-mode', 'enabled');
  });

  it('opens the Acceptance Panel from Header Overflow and closes it without changing the completed layout state', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAcceptancePanel(user);
    await user.click(screen.getByRole('button', { name: '关闭验收面板' }));

    expect(screen.queryByRole('dialog', { name: '验收面板' })).not.toBeInTheDocument();
    expect(header()).toHaveAttribute('data-run-status', 'completed');
    expect(screen.getByRole('form', { name: '消息编辑器' })).toHaveAttribute('data-mode', 'enabled');
  });

  it('switches all six deterministic Scenarios and synchronizes Header, Timeline, Sidebar, and Composer', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAcceptancePanel(user);
    const switcher = screen.getByRole('combobox', { name: '选择场景' });

    for (const scenario of Object.values(scenarios)) {
      await user.selectOptions(switcher, scenario.id);
      expect(header()).toHaveAttribute('data-run-status', scenario.runStatus);
      expect(screen.getByRole('form', { name: '消息编辑器' })).toHaveAttribute('data-mode', scenario.composerMode);
      expect(within(screen.getByRole('region', { name: '当前场景' })).getByRole('heading', { name: scenario.name })).toBeInTheDocument();

      if (scenario.id === 'empty') {
        expect(screen.getByRole('region', { name: '空会话' })).toBeInTheDocument();
        expect(screen.queryByRole('list', { name: '会话时间线' })).not.toBeInTheDocument();
      } else {
        expect(screen.getByRole('list', { name: '会话时间线' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: scenario.conversations[0].title })).toBeInTheDocument();
      }
    }
  });

  it('synchronizes Conversation selection and Sidebar collapse without crossing their state boundaries', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '示例会话 B' }));
    expect(within(header()).getByText('示例会话 B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '示例会话 B' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: '切换侧边栏' }));
    expect(screen.getByRole('complementary', { name: '侧边栏' })).toHaveAttribute('data-collapsed', 'true');
    expect(within(header()).getByText('示例会话 B')).toBeInTheDocument();
  });

  it('supports keyboard Reasoning toggle and resets Composer, Conversation, Sidebar, Reasoning, and Intent on Scenario selection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAcceptancePanel(user);
    const switcher = screen.getByRole('combobox', { name: '选择场景' });

    await user.selectOptions(switcher, 'running');
    const reasoning = screen.getByRole('button', { name: '收起推理过程' });
    await user.click(reasoning);
    expect(screen.getByRole('button', { name: '展开推理过程' })).toBeInTheDocument();

    await user.selectOptions(switcher, 'completed');
    const composer = screen.getByRole('textbox', { name: '输入消息' });
    await user.type(composer, '  示例输入  ');
    await user.keyboard('{Enter}');
    expect(screen.getByText('composer.submit')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '示例会话 B' }));
    await user.click(screen.getByRole('button', { name: '切换侧边栏' }));
    await user.selectOptions(switcher, 'completed');

    expect(composer).toHaveValue('');
    expect(screen.getByText('暂无界面意图')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '示例会话 A' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('complementary', { name: '侧边栏' })).toHaveAttribute('data-collapsed', 'false');
    expect(screen.getByRole('button', { name: '展开推理过程' })).toBeInTheDocument();
  });

  it('records all four UiIntents without mutating the active Fixture or its Timeline', async () => {
    const user = userEvent.setup();
    const fixtureSnapshot = JSON.stringify(scenarios);
    render(<App />);
    await openAcceptancePanel(user);
    const switcher = screen.getByRole('combobox', { name: '选择场景' });

    const composer = screen.getByRole('textbox', { name: '输入消息' });
    await user.type(composer, '第一行');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(composer, '第二行');
    await user.keyboard('{Enter}');
    expect(screen.getByText('composer.submit')).toBeInTheDocument();
    expect(screen.getByLabelText('界面意图参数')).toHaveTextContent('{"content":"第一行\\n第二行"}');
    expect(within(screen.getByRole('list', { name: '会话时间线' })).getAllByRole('listitem')).toHaveLength(5);

    await user.selectOptions(switcher, 'running');
    await user.click(screen.getByRole('button', { name: '停止运行' }));
    expect(screen.getByText('run.stop')).toBeInTheDocument();
    expect(header()).toHaveAttribute('data-run-status', 'running');
    expect(within(screen.getByRole('list', { name: '会话时间线' })).getAllByRole('listitem')).toHaveLength(3);

    await user.selectOptions(switcher, 'waiting-approval');
    await user.click(screen.getByRole('button', { name: '批准工具调用 example_tool' }));
    expect(screen.getByText('permission.approve')).toBeInTheDocument();
    expect(screen.getByLabelText('界面意图参数')).toHaveTextContent('{"toolCallId":"approval-call-1"}');
    await user.click(screen.getByRole('button', { name: '拒绝工具调用 example_tool' }));
    expect(screen.getByText('permission.deny')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '会话时间线' })).getAllByRole('listitem')).toHaveLength(4);
    expect(JSON.stringify(scenarios)).toBe(fixtureSnapshot);
  });
});
