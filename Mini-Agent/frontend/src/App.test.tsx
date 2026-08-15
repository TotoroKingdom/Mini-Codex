import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the application smoke test', () => {
    render(<App />);

    expect(screen.getByRole('main', { name: '会话内容' })).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: '应用顶部栏' })).toBeInTheDocument();
  });
});
