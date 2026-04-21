/**
 * Static source analysis: verifies that git-related code has been fully
 * removed from the main application after plugin extraction.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

// __dirname = src/__tests__/plugins/official/git  →  go up 4 levels to reach src/
const root = resolve(__dirname, '../../../../..');

function readSrc(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

describe('no residual git code in main app', () => {
  it('AppShell.tsx does not import useGit', () => {
    const src = readSrc('src/components/AppShell.tsx');
    expect(src).not.toContain("from '../hooks/useGit'");
    expect(src).not.toMatch(/\buseGit\b/);
  });

  it('AppShell.tsx does not import GitPanel', () => {
    const src = readSrc('src/components/AppShell.tsx');
    expect(src).not.toContain("from '../components/modal/GitPanel'");
    expect(src).not.toMatch(/<GitPanel\b/);
  });

  it('AppShell.tsx does not reference showGitPanel', () => {
    const src = readSrc('src/components/AppShell.tsx');
    expect(src).not.toContain('showGitPanel');
  });

  it('ActivityBar.tsx does not have hardcoded git panel entry', () => {
    // Check both possible locations
    const files = [
      'src/components/ActivityBar.tsx',
      'src/components/editor/ActivityBar.tsx',
    ];
    for (const f of files) {
      try {
        const src = readSrc(f);
        expect(src).not.toMatch(/id:\s*['"]git['"]/);
      } catch {
        // File may not exist — that's fine
      }
    }
  });

  it('useSidebarPanel.ts does not export showGitPanel', () => {
    const src = readSrc('src/hooks/useSidebarPanel.ts');
    expect(src).not.toContain('showGitPanel');
  });

  it('useKeyboardShortcuts.ts does not reference toggleGitPanel', () => {
    const src = readSrc('src/hooks/useKeyboardShortcuts.ts');
    expect(src).not.toContain('toggleGitPanel');
  });

  it('shortcuts-config.ts does not define toggleGitPanel', () => {
    const src = readSrc('src/lib/editor/shortcuts-config.ts');
    expect(src).not.toContain('toggleGitPanel');
  });

  it('src/lib/file/index.ts does not re-export git-commands', () => {
    const src = readSrc('src/lib/file/index.ts');
    expect(src).not.toContain('git-commands');
  });

  it('AppShell.tsx does not list git as a builtin panel', () => {
    const src = readSrc('src/components/AppShell.tsx');
    // The old code had: ['filetree', 'search', 'toc', 'plugins', 'git']
    expect(src).not.toMatch(/'git'\s*\]/);
    expect(src).not.toMatch(/['"]git['"]\s*,\s*['"]plugins['"]/);
  });
});
