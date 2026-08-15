import { render, screen } from '@testing-library/react';
import { ApplicationTopBar } from './ApplicationTopBar';

describe('ApplicationTopBar', () => {
  it('renders all shell navigation, menu, and window controls', () => {
    render(<ApplicationTopBar />);

    expect(screen.getByRole('banner', { name: '应用顶部栏' })).toBeInTheDocument();
    ['切换侧边栏', '后退', '前进', '最小化窗口', '最大化窗口', '关闭窗口'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });
    ['文件', '编辑', '视图', '帮助'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });
  });
});
