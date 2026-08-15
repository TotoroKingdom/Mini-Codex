import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusNotice } from './StatusNotice';
import { ToolCall } from './ToolCall';
import toolCallStyles from './ToolCall.module.css';
import { ToolResult } from './ToolResult';
import toolResultStyles from './ToolResult.module.css';

const longOutput = '{\n  "path": "' + 'very-long-segment/'.repeat(30) + '"\n}';

describe('tool and status components', () => {
  it.each([
    ['requested', '已请求'],
    ['waiting_approval', '等待批准'],
    ['running', '正在运行'],
    ['completed', '已完成'],
    ['failed', '执行失败'],
    ['denied', '已拒绝'],
    ['cancelled', '已取消'],
  ] as const)('renders the %s Tool Call status', (status, label) => {
    render(
      <ToolCall
        item={{ id: `tool-${status}`, kind: 'tool-call', toolCallId: 'call-1', toolName: 'read_file', summary: '读取 SPEC', input: longOutput, status, requiresApproval: false }}
      />,
    );

    expect(screen.getByRole('article', { name: '工具调用：read_file' })).toHaveAttribute('data-status', status);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('reports approval and denial intents for a waiting Tool Call', async () => {
    const user = userEvent.setup();
    const onIntent = vi.fn();
    render(
      <ToolCall
        item={{ id: 'tool-waiting', kind: 'tool-call', toolCallId: 'call-approval', toolName: 'apply_patch', summary: '修改样式', input: longOutput, status: 'waiting_approval', requiresApproval: true }}
        onIntent={onIntent}
      />,
    );

    await user.click(screen.getByRole('button', { name: '批准工具调用 apply_patch' }));
    await user.click(screen.getByRole('button', { name: '拒绝工具调用 apply_patch' }));

    expect(onIntent).toHaveBeenNthCalledWith(1, { type: 'permission.approve', toolCallId: 'call-approval' });
    expect(onIntent).toHaveBeenNthCalledWith(2, { type: 'permission.deny', toolCallId: 'call-approval' });
    expect(screen.getByLabelText('工具输入')).toHaveClass(toolCallStyles.input);
  });

  it.each([
    ['success', '执行成功'],
    ['failed', '执行失败'],
    ['cancelled', '执行已取消'],
  ] as const)('renders the %s Tool Result outcome with bounded output', (outcome, label) => {
    render(
      <ToolResult item={{ id: `result-${outcome}`, kind: 'tool-result', toolCallId: 'call-1', outcome, content: longOutput, durationLabel: '耗时 34 秒' }} />,
    );

    expect(screen.getByRole('article', { name: '工具结果' })).toHaveAttribute('data-outcome', outcome);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByLabelText('工具输出')).toHaveClass(toolResultStyles.content);
  });

  it.each([
    ['running', '正在运行'],
    ['waiting_approval', '等待批准'],
    ['failed', '运行失败'],
    ['cancelled', '运行已取消'],
  ] as const)('renders the %s status notice with visible text meaning', (tone, title) => {
    render(<StatusNotice item={{ id: `notice-${tone}`, kind: 'status-notice', tone, title, description: '这是状态说明。' }} />);

    expect(screen.getByRole('status', { name: `运行状态：${title}` })).toHaveAttribute('data-tone', tone);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText('这是状态说明。')).toBeInTheDocument();
  });
});
