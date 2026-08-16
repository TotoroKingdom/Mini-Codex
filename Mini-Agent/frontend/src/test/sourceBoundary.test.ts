import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const sourceRoot = resolve(process.cwd(), 'src');
const sourceFilePattern = /\.(?:ts|tsx|css)$/;
const testFilePattern = /(?:\.test\.(?:ts|tsx)|\\test\\|\/test\/)/;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    return entry.isDirectory() ? listSourceFiles(filePath) : [filePath];
  });
}

const forbiddenBoundaries = [
  ['浏览器持久化', /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/],
  ['Router', /\b(react-router|createBrowserRouter|BrowserRouter|useNavigate)\b/],
  ['全局状态库', /\b(redux|zustand|mobx|jotai|recoil)\b/],
  ['异步 Mock Agent', /\bmock\s*agent\b/i],
  ['不安全 HTML 注入', /\bdangerouslySetInnerHTML\b/],
] as const;

function isApiSource(filePath: string): boolean {
  return relative(sourceRoot, filePath).split(/[\\/]/)[0] === 'api';
}

describe('M01 source boundaries', () => {
  const applicationSources = listSourceFiles(sourceRoot)
    .filter((filePath) => sourceFilePattern.test(filePath) && !testFilePattern.test(filePath));

  it('keeps production source free of persistence, Router, global-state, async Mock Agent, and unsafe HTML boundaries', () => {
    const violations = applicationSources.flatMap((filePath) => {
      const content = readFileSync(filePath, 'utf8');
      return forbiddenBoundaries
        .filter(([, pattern]) => pattern.test(content))
        .map(([name]) => `${relative(sourceRoot, filePath)}: ${name}`);
    });

    expect(violations).toEqual([]);
  });

  it('allows fetch and request timers only inside the API boundary', () => {
    const networkRuntimeOutsideApi = applicationSources
      .filter((filePath) => !isApiSource(filePath))
      .filter((filePath) => /\b(fetch|setTimeout|setInterval|requestAnimationFrame)\b/.test(readFileSync(filePath, 'utf8')))
      .map((filePath) => relative(sourceRoot, filePath));

    expect(networkRuntimeOutsideApi).toEqual([]);
  });

  it('keeps the presentation boundary local and dependency-light', () => {
    const presentationSources = applicationSources.filter((filePath) => filePath.includes(`${join('src', 'presentation')}`));
    const imports = presentationSources.flatMap((filePath) => (
      readFileSync(filePath, 'utf8').match(/^import .*$/gm) ?? []
    ));

    expect(presentationSources.length).toBeGreaterThan(0);
    expect(imports).toEqual([]);
  });

  it('keeps Fixtures, presentation, and display components free of Backend imports', () => {
    const pureDisplaySources = applicationSources.filter((filePath) => (
      filePath.includes(`${join('src', 'fixtures')}${'\\'}`)
      || filePath.includes(`${join('src', 'fixtures')}/`)
      || filePath.includes(`${join('src', 'presentation')}${'\\'}`)
      || filePath.includes(`${join('src', 'presentation')}/`)
      || filePath.includes(`${join('src', 'components')}${'\\'}`)
      || filePath.includes(`${join('src', 'components')}/`)
    ));
    const backendImports = pureDisplaySources.flatMap((filePath) => {
      const imports = readFileSync(filePath, 'utf8').match(/^import .*$/gm) ?? [];
      return imports
        .filter((line) => /from ['"][^'"]*(?:\/api(?:\/|['"])|backendConnection)[^'"]*['"]/.test(line))
        .map((line) => `${relative(sourceRoot, filePath)}: ${line}`);
    });

    expect(backendImports).toEqual([]);
  });
});
