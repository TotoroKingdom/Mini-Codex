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
    expect(screen.getByRole('button', { name: '当前示例会话' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('用户')).toBeInTheDocument();
    expect(document.querySelector('[data-scroll-region="sidebar"]')).toBeInTheDocument();
  });

  it('renders a 64px collapsed state that keeps only essential entry points', () => {
    render(<Sidebar collapsed />);

    const sidebar = screen.getByRole('complementary', { name: '侧边栏' });
    expect(sidebar).toHaveClass(styles.collapsed);
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByRole('button', { name: 'Codex 工作区' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新对话' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '置顶' })).not.toBeInTheDocument();
    expect(screen.queryByText('用户')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打开用户菜单' })).toBeInTheDocument();
  });

  it('selects Project and Recent conversations and exposes their hover action controls', async () => {
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
      />,
    );

    await user.click(screen.getByRole('button', { name: '项目示例 A' }));
    await user.click(screen.getByRole('button', { name: '示例记录 A' }));

    expect(onConversationSelect).toHaveBeenNthCalledWith(1, 'project-a');
    expect(onConversationSelect).toHaveBeenNthCalledWith(2, 'recent-a');
    expect(screen.getByRole('button', { name: '项目更多操作' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建项目' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '最近更多操作' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑最近分组' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打开项目示例 A操作菜单' })).toBeInTheDocument();
  });
});
