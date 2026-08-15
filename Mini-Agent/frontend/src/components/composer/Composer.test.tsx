import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Composer } from './Composer';
import styles from './Composer.module.css';

describe('Composer', () => {
  it('keeps the send control disabled for a blank draft and exposes all primary controls', () => {
    render(<Composer mode="enabled" onIntent={vi.fn()} />);

    expect(screen.getByRole('form', { name: '消息编辑器' })).toHaveClass(styles.composer);
    expect(screen.getByRole('textbox', { name: '输入消息' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled();
    ['添加附件', '选择附件', '访问设置', '模型选择：示例模型', '语音输入'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });
  });

  it('submits trimmed content with Enter and clears the draft', async () => {
    const user = userEvent.setup();
    const onIntent = vi.fn();
    render(<Composer mode="enabled" onIntent={onIntent} />);
    const input = screen.getByRole('textbox', { name: '输入消息' });

    await user.type(input, '  请检查布局  ');
    await user.keyboard('{Enter}');

    expect(onIntent).toHaveBeenCalledWith({ type: 'composer.submit', content: '请检查布局' });
    expect(input).toHaveValue('');
  });

  it('keeps a newline for Shift+Enter and does not submit until Enter', async () => {
    const user = userEvent.setup();
    const onIntent = vi.fn();
    render(<Composer mode="enabled" onIntent={onIntent} />);
    const input = screen.getByRole('textbox', { name: '输入消息' });

    await user.type(input, '第一行');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(input, '第二行');

    expect(input).toHaveValue('第一行\n第二行');
    expect(onIntent).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(onIntent).toHaveBeenCalledWith({ type: 'composer.submit', content: '第一行\n第二行' });
  });

  it.each([
    ['disabled_running', '当前运行正在进行，暂时无法发送新消息。'],
    ['disabled_waiting_approval', '当前操作正在等待批准，暂时无法发送新消息。'],
  ] as const)('disables input for %s and sends run.stop', async (mode, message) => {
    const user = userEvent.setup();
    const onIntent = vi.fn();
    render(<Composer mode={mode} onIntent={onIntent} />);

    expect(screen.getByRole('textbox', { name: '输入消息' })).toBeDisabled();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '停止运行' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '停止运行' }));
    expect(onIntent).toHaveBeenCalledWith({ type: 'run.stop' });
  });
});
