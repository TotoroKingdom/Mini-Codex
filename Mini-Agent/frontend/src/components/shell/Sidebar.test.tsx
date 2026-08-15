import { render, screen } from '@testing-library/react';
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
});
