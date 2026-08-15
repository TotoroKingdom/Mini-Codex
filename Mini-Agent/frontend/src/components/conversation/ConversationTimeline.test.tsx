import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { completedConversation } from '../../app/completedConversation';
import type { TimelineItem } from '../../presentation';
import { ConversationTimeline } from './ConversationTimeline';
import styles from './ConversationTimeline.module.css';
import toolCallStyles from './ToolCall.module.css';
import toolResultStyles from './ToolResult.module.css';

const allKinds: TimelineItem[] = [
  { id: 'user', kind: 'user-message', content: '用户请求', createdAtLabel: '10:00' },
  { id: 'assistant', kind: 'assistant-message', content: '助手回复', createdAtLabel: '10:01', isPartial: false },
  { id: 'reasoning', kind: 'reasoning', title: '推理', content: '推理内容', defaultExpanded: false, isActive: false },
  { id: 'call', kind: 'tool-call', toolCallId: 'call-1', toolName: 'read_file', summary: '读取文件', input: '{"path":"SPEC.md"}', status: 'waiting_approval', requiresApproval: true },
  { id: 'result', kind: 'tool-result', toolCallId: 'call-1', outcome: 'success', content: '读取成功', durationLabel: '耗时 1 秒' },
  { id: 'notice', kind: 'status-notice', tone: 'failed', title: '运行失败', description: '网络不可用。' },
];

describe('ConversationTimeline', () => {
  it('dispatches all six item kinds in the supplied semantic reading order', () => {
    render(<ConversationTimeline items={allKinds} />);

    const timeline = screen.getByRole('list', { name: '会话时间线' });
    expect(timeline).toHaveClass(styles.timeline);
    expect(within(timeline).getAllByRole('listitem').map((item) => item.getAttribute('data-kind'))).toEqual([
      'user-message', 'assistant-message', 'reasoning', 'tool-call', 'tool-result', 'status-notice',
    ]);
    expect(screen.getByRole('article', { name: '用户消息' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: '助手消息' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: '工具调用：read_file' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: '工具结果' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '运行状态：运行失败' })).toBeInTheDocument();
  });

  it('forwards reasoning and permission callbacks without changing timeline data', async () => {
    const user = userEvent.setup();
    const onReasoningToggle = vi.fn();
    const onIntent = vi.fn();
    const originalKinds = allKinds.map((item) => item.kind);
    render(<ConversationTimeline items={allKinds} onIntent={onIntent} onReasoningToggle={onReasoningToggle} />);

    await user.click(screen.getByRole('button', { name: '展开推理过程' }));
    await user.click(screen.getByRole('button', { name: '批准工具调用 read_file' }));

    expect(onReasoningToggle).toHaveBeenCalledWith('reasoning');
    expect(onIntent).toHaveBeenCalledWith({ type: 'permission.approve', toolCallId: 'call-1' });
    expect(allKinds.map((item) => item.kind)).toEqual(originalKinds);
  });

  it('renders fixed Completed data without Scenario state and keeps its long-content containers constrained', () => {
    render(<ConversationTimeline items={completedConversation} />);

    const timeline = screen.getByRole('list', { name: '会话时间线' });
    expect(within(timeline).getAllByRole('listitem').map((item) => item.getAttribute('data-kind'))).toEqual([
      'user-message', 'reasoning', 'tool-call', 'tool-result', 'assistant-message',
    ]);
    expect(screen.getByLabelText('工具输入')).toHaveClass(toolCallStyles.input);
    expect(screen.getByLabelText('工具输出')).toHaveClass(toolResultStyles.content);
  });
});
