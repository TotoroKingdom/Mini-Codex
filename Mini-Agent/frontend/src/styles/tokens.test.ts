import { readFileSync } from 'node:fs';

const tokens = readFileSync('src/styles/tokens.css', 'utf8');

describe('design tokens', () => {
  it.each([
    'surface',
    'text',
    'border',
    'state',
    'font',
    'space',
    'icon',
    'radius',
    'shadow',
    'layer',
    'motion',
  ])('defines the %s semantic token category', (category) => {
    expect(tokens).toContain(`--${category}-`);
  });

  it('defines a visible focus token', () => {
    expect(tokens).toContain('--state-focus:');
  });
});
