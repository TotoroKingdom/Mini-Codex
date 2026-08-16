import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AddWorkspaceForm } from './AddWorkspaceForm';

describe('AddWorkspaceForm', () => {
  it('提供路径 Label、输入说明、可选名称和初始 Focus', () => {
    render(<AddWorkspaceForm onCancel={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: '绝对工作区路径' })).toHaveFocus();
    expect(screen.getByText('输入或粘贴路径以添加本机上的项目目录。')).toBeInTheDocument();
    expect(screen.getByText(/支持盘符绝对目录/)).toHaveTextContent('C:\\work\\mini-agent');
    expect(screen.getByRole('textbox', { name: '显示名称（可选）' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /浏览|上传|拖放/ })).not.toBeInTheDocument();
  });

  it('只上报默认 Create 所需的 root_path 或可选 name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(<AddWorkspaceForm onCancel={vi.fn()} onSubmit={onSubmit} />);
    const path = screen.getByRole('textbox', { name: '绝对工作区路径' });

    await user.type(path, 'C:\\work\\default');
    await user.click(screen.getByRole('button', { name: '添加工作区' }));
    expect(onSubmit).toHaveBeenCalledWith({ root_path: 'C:\\work\\default' });

    rerender(<AddWorkspaceForm error={{ code: 'workspace_path_missing', field: 'root_path' }} onCancel={vi.fn()} onSubmit={onSubmit} />);
    await user.clear(path);
    await user.type(path, 'C:\\work\\custom');
    await user.type(screen.getByRole('textbox', { name: '显示名称（可选）' }), '自定义名称');
    await user.click(screen.getByRole('button', { name: '添加工作区' }));
    expect(onSubmit).toHaveBeenLastCalledWith({ root_path: 'C:\\work\\custom', name: '自定义名称' });
  });

  it('空路径显示关联校验错误，且不会上报创建', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddWorkspaceForm onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: '添加工作区' }));

    const path = screen.getByRole('textbox', { name: '绝对工作区路径' });
    expect(path).toHaveAttribute('aria-invalid', 'true');
    expect(path).toHaveAccessibleDescription(expect.stringContaining('请输入绝对工作区路径。'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Pending 时禁用输入与确认，并阻止重复提交', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddWorkspaceForm pending onCancel={vi.fn()} onSubmit={onSubmit} />);

    expect(screen.getByRole('textbox', { name: '绝对工作区路径' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '显示名称（可选）' })).toBeDisabled();
    const submit = screen.getByRole('button', { name: '正在添加…' });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('父级尚未来得及更新 Pending 时也只上报一次提交', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddWorkspaceForm onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: '绝对工作区路径' }), 'C:\\work\\once');
    await user.dblClick(screen.getByRole('button', { name: '添加工作区' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Cancel 或 Escape 不创建，并将焦点返回调用方', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    render(<AddWorkspaceForm onCancel={onCancel} onSubmit={vi.fn()} returnFocusRef={{ current: trigger }} />);

    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();

    await user.click(screen.getByRole('textbox', { name: '绝对工作区路径' }));
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(2);
    trigger.remove();
  });

  it('将领域错误关联到正确字段，并拒绝原始内部错误文本', () => {
    const { rerender } = render(
      <AddWorkspaceForm error={{ code: 'workspace_path_missing', field: 'root_path' }} onCancel={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('textbox', { name: '绝对工作区路径' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('该路径不存在。');

    rerender(<AddWorkspaceForm error={{ code: 'unknown', field: 'name' }} onCancel={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: '显示名称（可选）' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('工作区操作未能完成，请稍后重试。');
  });
});
