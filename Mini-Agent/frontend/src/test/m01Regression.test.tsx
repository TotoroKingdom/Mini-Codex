import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { scenarioList, scenarios } from '../fixtures';
import { COMPOSER_MODES, TIMELINE_ITEM_KINDS } from '../presentation';

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '更多会话选项' }));
  return screen.getByRole('dialog', { name: '验收面板' });
}

describe('M01 regression', () => {
  it('covers all Shell regions and primary reference controls in the default completed view', () => {
    render(<App />);

    expect(screen.getByRole('banner', { name: '应用顶部栏' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '侧边栏' })).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: '会话标题栏' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: '会话内容' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '消息编辑器外壳' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '验收面板' })).not.toBeInTheDocument();

    [
      '切换侧边栏', '后退', '前进', '更多会话选项', '添加附件',
      '选择附件', '访问设置', '模型选择：示例模型', '语音输入', '发送消息',
    ].forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
  });

  it('covers six Scenarios, six Timeline kinds, and all three Composer modes without reset drift', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPanel(user);
    const switcher = screen.getByRole('combobox', { name: '选择场景' });
    const seenScenarioIds = new Set<string>();
    const seenKinds = new Set<string>();
    const seenComposerModes = new Set<string>();

    for (const scenario of scenarioList) {
      await user.selectOptions(switcher, scenario.id);
      seenScenarioIds.add(scenario.id);
      seenComposerModes.add(screen.getByRole('form', { name: '消息编辑器' }).getAttribute('data-mode')!);
      screen.queryAllByRole('listitem').forEach((item) => {
        const kind = item.getAttribute('data-kind');
        if (kind) seenKinds.add(kind);
      });
    }

    expect([...seenScenarioIds]).toEqual(scenarioList.map((scenario) => scenario.id));
    expect([...seenKinds].sort()).toEqual([...TIMELINE_ITEM_KINDS].sort());
    expect([...seenComposerModes].sort()).toEqual([...COMPOSER_MODES].sort());

    await user.selectOptions(switcher, 'completed');
    expect(screen.getByRole('button', { name: '示例会话 A' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('form', { name: '消息编辑器' })).toHaveAttribute('data-mode', 'enabled');
  });

  it('keeps Fixtures and Timeline stable while monitoring every UiIntent payload', async () => {
    const user = userEvent.setup();
    const fixtureSnapshot = JSON.stringify(scenarios);
    render(<App />);
    await openPanel(user);
    const switcher = screen.getByRole('combobox', { name: '选择场景' });

    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '示例提交');
    await user.keyboard('{Enter}');
    expect(screen.getByText('composer.submit')).toBeInTheDocument();
    expect(screen.getByLabelText('界面意图参数')).toHaveTextContent('{"content":"示例提交"}');

    await user.selectOptions(switcher, 'running');
    await user.click(screen.getByRole('button', { name: '停止运行' }));
    expect(screen.getByText('run.stop')).toBeInTheDocument();

    await user.selectOptions(switcher, 'waiting-approval');
    const timeline = screen.getByRole('list', { name: '会话时间线' });
    const beforeIntentKinds = within(timeline).getAllByRole('listitem').map((item) => item.getAttribute('data-kind'));
    await user.click(screen.getByRole('button', { name: '批准工具调用 example_tool' }));
    expect(screen.getByText('permission.approve')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '拒绝工具调用 example_tool' }));
    expect(screen.getByText('permission.deny')).toBeInTheDocument();
    expect(within(timeline).getAllByRole('listitem').map((item) => item.getAttribute('data-kind'))).toEqual(beforeIntentKinds);
    expect(JSON.stringify(scenarios)).toBe(fixtureSnapshot);
  });
});
