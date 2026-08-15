import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';
import styles from './AppShell.module.css';
import sidebarStyles from '../components/shell/Sidebar.module.css';

describe('AppShell', () => {
  it('renders the complete desktop shell with independent conversation scroll boundary', () => {
    render(<AppShell />);

    expect(screen.getByRole('banner', { name: '应用顶部栏' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '侧边栏' })).toHaveClass(sidebarStyles.expanded);
    expect(screen.getByRole('banner', { name: '会话标题栏' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: '会话内容' })).toHaveClass(styles.mainScroll);
    expect(screen.getByLabelText('时间线插槽')).toHaveClass(styles.timelineSlot);
    expect(screen.getByRole('region', { name: '消息编辑器外壳' })).toBeInTheDocument();
  });

  it('passes the presentational collapsed layout state to the sidebar', () => {
    const { container } = render(<AppShell sidebarCollapsed />);

    expect(container.firstChild).toHaveAttribute('data-sidebar-collapsed', 'true');
    expect(screen.getByRole('complementary', { name: '侧边栏' })).toHaveClass(sidebarStyles.collapsed);
  });

  it('exposes the first major shell control to keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.tab();

    expect(screen.getByRole('button', { name: '切换侧边栏' })).toHaveFocus();
  });
});
