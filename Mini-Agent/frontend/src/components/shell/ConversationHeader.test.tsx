import { render, screen } from '@testing-library/react';
import { ConversationHeader } from './ConversationHeader';
import styles from './ConversationHeader.module.css';

describe('ConversationHeader', () => {
  it('renders the title, overflow, and reference view controls', () => {
    render(<ConversationHeader title="阅读@PROJECT.md@ARCHITECTURE.md@ROADMAP.md" />);

    expect(screen.getByRole('banner', { name: '会话标题栏' })).toBeInTheDocument();
    expect(screen.getByText('阅读@PROJECT.md@ARCHITECTURE.md@ROADMAP.md')).toHaveClass(styles.title);
    ['更多会话选项', '选择工作区', '会话控制', '列表视图', '分栏视图', '显示右侧面板'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });
  });

  it('uses a truncating title style for long titles', () => {
    render(<ConversationHeader title="一个很长的会话标题" />);

    const title = screen.getByText('一个很长的会话标题');
    expect(title).toHaveClass(styles.title);
  });
});
