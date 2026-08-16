import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WorkspaceList, type WorkspaceListItem } from './WorkspaceList';
import styles from './WorkspaceList.module.css';

const items: WorkspaceListItem[] = [
  { id: 'available', name: '可用项目', root_path: 'C:\\work\\available', availability: 'available' },
  { id: 'missing', name: '缺失项目', root_path: 'C:\\work\\missing', availability: 'missing' },
  { id: 'file', name: '文件项目', root_path: 'C:\\work\\file', availability: 'not_directory' },
  { id: 'blocked', name: '受限项目', root_path: 'C:\\work\\blocked', availability: 'inaccessible' },
];

function renderList(overrides: Partial<React.ComponentProps<typeof WorkspaceList>> = {}) {
  const callbacks = {
    onOpen: vi.fn(),
    onRecheck: vi.fn(),
    onRename: vi.fn(),
  };
  render(<WorkspaceList activeWorkspaceId={null} items={items} {...callbacks} {...overrides} />);
  return callbacks;
}

describe('WorkspaceList', () => {
  it('按传入顺序展示四种 Availability、根路径与非纯颜色状态文本', () => {
    renderList();

    const list = screen.getByRole('list', { name: '工作区列表' });
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('可用项目'),
      expect.stringContaining('缺失项目'),
      expect.stringContaining('文件项目'),
      expect.stringContaining('受限项目'),
    ]));
    expect(screen.getByText('状态：可用')).toBeInTheDocument();
    expect(screen.getByText('状态：目录缺失')).toBeInTheDocument();
    expect(screen.getByText('状态：不是目录')).toBeInTheDocument();
    expect(screen.getByText('状态：无法访问')).toBeInTheDocument();
    expect(screen.getByLabelText('根路径：C:\\work\\available')).toBeInTheDocument();
    expect(list).toHaveClass(styles.list);
  });

  it('用 aria-current 标识当前项，并让长名称和路径安全换行', () => {
    const longItem: WorkspaceListItem = {
      id: 'long',
      name: '很长的工作区显示名称用于验证不会造成侧栏横向溢出',
      root_path: 'C:\\very-long-workspace-root\\with-many-segments\\and-a-very-long-directory-name',
      availability: 'available',
    };
    renderList({ activeWorkspaceId: 'long', items: [longItem] });

    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText(longItem.name)).toHaveClass(styles.name);
    expect(screen.getByLabelText(`根路径：${longItem.root_path}`)).toHaveClass(styles.path);
  });

  it('通过回调上报 Open、Recheck 与 Rename，不自行处理请求', async () => {
    const user = userEvent.setup();
    const callbacks = renderList();

    await user.click(screen.getByRole('button', { name: '打开 可用项目' }));
    await user.click(screen.getByRole('button', { name: '重新检查并打开 缺失项目' }));
    await user.click(screen.getByRole('button', { name: '重命名 文件项目' }));

    expect(callbacks.onOpen).toHaveBeenCalledWith('available');
    expect(callbacks.onRecheck).toHaveBeenCalledWith('missing');
    expect(callbacks.onRename).toHaveBeenCalledWith('file');
  });

  it('Pending 时禁用每项操作，阻止重复意图', async () => {
    const user = userEvent.setup();
    const callbacks = renderList({ pending: true });

    const open = screen.getByRole('button', { name: '打开 可用项目' });
    const recheck = screen.getByRole('button', { name: '重新检查并打开 缺失项目' });
    const rename = screen.getByRole('button', { name: '重命名 可用项目' });
    expect(open).toBeDisabled();
    expect(recheck).toBeDisabled();
    expect(rename).toBeDisabled();
    await user.click(open);
    expect(callbacks.onOpen).not.toHaveBeenCalled();
  });
});
