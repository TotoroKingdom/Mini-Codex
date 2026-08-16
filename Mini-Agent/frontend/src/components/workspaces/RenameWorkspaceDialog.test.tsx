import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RenameWorkspaceDialog } from './RenameWorkspaceDialog';

const defaultProps = {
  currentName: 'Mini Agent',
  onCancel: vi.fn(),
  onSubmit: vi.fn(),
  workspaceId: 'workspace-1',
};

describe('RenameWorkspaceDialog', () => {
  it('提供可访问 Dialog、初始名称和初始 Focus', () => {
    render(<RenameWorkspaceDialog {...defaultProps} />);

    expect(screen.getByRole('dialog', { name: '重命名工作区' })).toHaveAttribute('aria-modal', 'true');
    const input = screen.getByRole('textbox', { name: '显示名称' });
    expect(input).toHaveValue('Mini Agent');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('textbox', { name: /路径/ })).not.toBeInTheDocument();
  });

  it('仅提交 workspace_id 和编辑后的显示名称', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RenameWorkspaceDialog {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox', { name: '显示名称' });
    await user.clear(input);
    await user.type(input, 'Renamed Workspace');
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledWith({ workspace_id: 'workspace-1', name: 'Renamed Workspace' });
  });

  it('Pending 时禁用输入和确认，且不会重复提交', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RenameWorkspaceDialog {...defaultProps} onSubmit={onSubmit} pending />);

    expect(screen.getByRole('textbox', { name: '显示名称' })).toBeDisabled();
    const submit = screen.getByRole('button', { name: '正在保存…' });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('父级尚未来得及更新 Pending 时也只上报一次确认', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RenameWorkspaceDialog {...defaultProps} onSubmit={onSubmit} />);

    await user.dblClick(screen.getByRole('button', { name: '保存名称' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Cancel 和 Escape 不提交并将焦点返还给触发控件', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    render(<RenameWorkspaceDialog {...defaultProps} onCancel={onCancel} returnFocusRef={{ current: trigger }} />);

    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();

    await user.click(screen.getByRole('textbox', { name: '显示名称' }));
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(2);
    trigger.remove();
  });

  it('将名称领域错误关联输入，且不会显示原始异常内容', () => {
    const { rerender } = render(
      <RenameWorkspaceDialog {...defaultProps} error={{ code: 'workspace_name_invalid', field: 'name' }} />,
    );
    expect(screen.getByRole('textbox', { name: '显示名称' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('显示名称不符合要求。');

    rerender(<RenameWorkspaceDialog {...defaultProps} error={{ code: 'C:\\private\\traceback', field: 'name' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('工作区操作未能完成，请稍后重试。');
    expect(screen.queryByText(/private|traceback/i)).not.toBeInTheDocument();
  });
});
