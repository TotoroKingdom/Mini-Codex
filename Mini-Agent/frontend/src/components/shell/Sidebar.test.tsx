import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import styles from './Sidebar.module.css';

describe('Sidebar', () => {
  it('renders the expanded information-dense sidebar with current item and footer', () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole('complementary', { name: '侧边栏' });
    expect(sidebar).toHaveClass(styles.expanded);
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    ['置顶', '项目', '最近'].forEach((name) => expect(screen.getByRole('heading', { name })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '新对话' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加工作区' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '当前示例会话' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('用户')).toBeInTheDocument();
    expect(document.querySelector('[data-scroll-region="sidebar"]')).toBeInTheDocument();
  });

  it('renders a 64px collapsed state that keeps only essential entry points', () => {
    render(
      <Sidebar
        collapsed
        workspaceActiveId="workspace-a"
        workspaceItems={[{ id: 'workspace-a', name: 'Mini Agent', root_path: 'C:\\AI\\Mini-Codex\\Mini-Agent', availability: 'available' }]}
      />,
    );

    const sidebar = screen.getByRole('complementary', { name: '侧边栏' });
    expect(sidebar).toHaveClass(styles.collapsed);
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByRole('button', { name: 'Codex 工作区' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新对话' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加工作区' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '当前工作区：Mini Agent' })).toHaveAttribute('title', 'C:\\AI\\Mini-Codex\\Mini-Agent');
    expect(screen.queryByRole('heading', { name: '置顶' })).not.toBeInTheDocument();
    expect(screen.queryByText('用户')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打开用户菜单' })).toBeInTheDocument();
  });

  it('keeps Fixture conversations independent and exposes Workspace Collection operations', async () => {
    const user = userEvent.setup();
    const onConversationSelect = vi.fn();
    render(
      <Sidebar
        conversations={[
          { id: 'pinned', title: '置顶会话', collection: 'pinned', timeline: [] },
          { id: 'project-a', title: '项目示例 A', collection: 'project', timeline: [] },
          { id: 'recent-a', title: '示例记录 A', collection: 'recent', timeline: [] },
        ]}
        onConversationSelect={onConversationSelect}
        workspaceActiveId="workspace-a"
        workspaceCollectionStatus="ready"
        workspaceItems={[{ id: 'workspace-a', name: 'Mini Agent', root_path: 'C:\\AI\\Mini-Codex\\Mini-Agent', availability: 'available' }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: '项目示例 A' }));
    await user.click(screen.getByRole('button', { name: '示例记录 A' }));

    expect(onConversationSelect).toHaveBeenNthCalledWith(1, 'project-a');
    expect(onConversationSelect).toHaveBeenNthCalledWith(2, 'recent-a');
    expect(screen.getByRole('button', { name: '打开 Mini Agent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重命名 Mini Agent' })).toBeInTheDocument();
    expect(screen.getByText('项目示例会话')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '最近更多操作' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑最近分组' })).toBeInTheDocument();
  });
});
