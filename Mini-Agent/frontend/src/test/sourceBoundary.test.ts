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
  ['Backend 或 HTTP client', /\b(fetch|XMLHttpRequest|WebSocket|EventSource|axios)\b/],
  ['浏览器持久化', /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/],
  ['Router', /\b(react-router|createBrowserRouter|BrowserRouter|useNavigate)\b/],
  ['计时器状态流转', /\b(setTimeout|setInterval|requestAnimationFrame)\b/],
  ['全局状态库', /\b(redux|zustand|mobx|jotai|recoil)\b/],
  ['异步 Agent Runtime', /\b(async|await|Promise|mock\s*agent)\b/i],
  ['不安全 HTML 注入', /\bdangerouslySetInnerHTML\b/],
] as const;

describe('M01 source boundaries', () => {
  const applicationSources = listSourceFiles(sourceRoot)
    .filter((filePath) => sourceFilePattern.test(filePath) && !testFilePattern.test(filePath));

  it('keeps production source free of Backend, persistence, Router, timer, global-state, and async-runtime boundaries', () => {
    const violations = applicationSources.flatMap((filePath) => {
      const content = readFileSync(filePath, 'utf8');
      return forbiddenBoundaries
        .filter(([, pattern]) => pattern.test(content))
        .map(([name]) => `${relative(sourceRoot, filePath)}: ${name}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps the presentation boundary local and dependency-light', () => {
    const presentationSources = applicationSources.filter((filePath) => filePath.includes(`${join('src', 'presentation')}`));
    const imports = presentationSources.flatMap((filePath) => (
      readFileSync(filePath, 'utf8').match(/^import .*$/gm) ?? []
    ));

    expect(presentationSources.length).toBeGreaterThan(0);
    expect(imports).toEqual([]);
  });
});
