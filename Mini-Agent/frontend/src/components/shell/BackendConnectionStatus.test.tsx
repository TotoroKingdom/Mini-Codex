import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BackendConnectionStatus } from './BackendConnectionStatus';
import styles from './BackendConnectionStatus.module.css';

describe('BackendConnectionStatus', () => {
  it.each([
    ['checking', '正在连接后端'],
    ['connected', '后端已连接'],
    ['disconnected', '后端未连接'],
  ] as const)('以文本和语义状态展示 %s', (status, message) => {
    render(<BackendConnectionStatus onRetry={vi.fn()} status={status} />);

    const indicator = screen.getByRole('status');
    expect(indicator).toHaveTextContent(message);
    expect(indicator.parentElement).toHaveAttribute('data-status', status);
    expect(indicator.parentElement).toHaveAccessibleName(`后端连接状态：${message}`);
  });

  it('在非 checking 状态提供带明确名称的 Retry 操作', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<BackendConnectionStatus onRetry={onRetry} status="disconnected" />);

    expect(screen.getByRole('button', { name: '重试连接后端' })).toHaveTextContent('重试');

    rerender(<BackendConnectionStatus onRetry={onRetry} status="connected" />);

    expect(screen.getByRole('button', { name: '重试连接后端' })).toHaveTextContent('重试');

    rerender(<BackendConnectionStatus onRetry={onRetry} status="checking" />);

    expect(screen.queryByRole('button', { name: '重试连接后端' })).not.toBeInTheDocument();
  });

  it('通过键盘操作将 Retry 意图回调给上层', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<BackendConnectionStatus onRetry={onRetry} status="disconnected" />);

    await user.tab();
    expect(screen.getByRole('button', { name: '重试连接后端' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('在展开和折叠状态保留可识别的连接状态与 Retry', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<BackendConnectionStatus onRetry={onRetry} status="disconnected" />);

    const expanded = screen.getByRole('status').parentElement;
    expect(expanded).toHaveClass(styles.root);
    expect(expanded).toHaveAttribute('data-collapsed', 'false');
    expect(expanded).toHaveAccessibleName('后端连接状态：后端未连接');

    rerender(<BackendConnectionStatus collapsed onRetry={onRetry} status="disconnected" />);

    const collapsed = screen.getByRole('status').parentElement;
    expect(collapsed).toHaveClass(styles.root);
    expect(collapsed).toHaveAttribute('data-collapsed', 'true');
    expect(collapsed).toHaveAccessibleName('后端连接状态：后端未连接');
    expect(screen.getByRole('button', { name: '重试连接后端' })).toBeInTheDocument();
  });
});
