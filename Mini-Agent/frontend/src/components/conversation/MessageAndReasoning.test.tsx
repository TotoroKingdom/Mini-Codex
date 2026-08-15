import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistantMessage } from './AssistantMessage';
import assistantStyles from './AssistantMessage.module.css';
import { Reasoning } from './Reasoning';
import reasoningStyles from './Reasoning.module.css';
import { UserMessage } from './UserMessage';
import userStyles from './UserMessage.module.css';

const longUrl = `https://example.test/${'very-long-path/'.repeat(18)}`;

describe('message and reasoning components', () => {
  it('renders a right-aligned user message with time and accessible actions', () => {
    render(<UserMessage item={{ id: 'user-1', kind: 'user-message', content: longUrl, createdAtLabel: '10:00' }} />);

    expect(screen.getByRole('article', { name: '用户消息' })).toHaveClass(userStyles.message);
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制用户消息' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑用户消息' })).toBeInTheDocument();
    expect(screen.getByText(longUrl)).toHaveClass(userStyles.bubble);
  });

  it('renders assistant metadata, feedback controls, and an explicit partial status', () => {
    render(
      <AssistantMessage
        durationLabel="耗时 34 秒"
        item={{ id: 'assistant-1', kind: 'assistant-message', content: '正在整理结果。', createdAtLabel: '10:01', isPartial: true }}
      />,
    );

    const message = screen.getByRole('article', { name: '助手消息' });
    expect(message).toHaveClass(assistantStyles.message);
    expect(message).toHaveAttribute('data-partial', 'true');
    expect(screen.getByText('正在生成')).toBeInTheDocument();
    expect(screen.getByText('耗时 34 秒')).toBeInTheDocument();
    ['复制助手消息', '赞同助手消息', '不赞同助手消息'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });
  });

  it('renders expanded active reasoning and calls the controlled toggle callback', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <Reasoning
        expanded
        isActive
        item={{ id: 'reasoning-1', kind: 'reasoning', title: '分析界面结构', content: `检查 ${longUrl}`, defaultExpanded: true, isActive: true }}
        onToggle={onToggle}
      />,
    );

    const toggle = screen.getByRole('button', { name: '收起推理过程' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('正在推理')).toBeInTheDocument();
    expect(screen.getByText(`检查 ${longUrl}`)).toHaveClass(reasoningStyles.content);

    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders collapsed completed reasoning without exposing its content', () => {
    render(
      <Reasoning
        expanded={false}
        isActive={false}
        item={{ id: 'reasoning-2', kind: 'reasoning', title: '已完成分析', content: '推理正文', defaultExpanded: false, isActive: false }}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '展开推理过程' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('推理完成')).toBeInTheDocument();
    expect(screen.getByText('推理正文')).not.toBeVisible();
  });
});
