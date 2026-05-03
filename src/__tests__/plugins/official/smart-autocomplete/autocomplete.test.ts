/**
 * Smart Autocomplete plugin — unit tests
 */

import { createFilePathCompleter } from '../src/file-path-completer';
import { createSnippetCompleter } from '../src/snippet-completer';

// ── Mock helpers ────────────────────────────────────────────────────────────

function makeContext(textBefore: string, pos?: number) {
  const fullText = textBefore;
  const p = pos ?? fullText.length;
  // Mock a minimal CompletionContext
  return {
    pos: p,
    state: {
      doc: {
        lineAt(pos: number) {
          const lines = fullText.split('\n');
          let offset = 0;
          for (let i = 0; i < lines.length; i++) {
            if (offset + lines[i].length >= pos) {
              return { number: i + 1, from: offset, text: lines[i], to: offset + lines[i].length };
            }
            offset += lines[i].length + 1;
          }
          return { number: lines.length, from: offset, text: '', to: offset };
        },
      },
      wordAt(pos: number) {
        const line = fullText.slice(0, pos).split('\n').pop() ?? '';
        const match = line.match(/[\w]+$/);
        if (!match) return null;
        return { from: pos - match[0].length, to: pos, text: match[0] };
      },
    },
  } as any;
}

// ── File path completer tests ────────────────────────────────────────────────

describe('filePathCompleter', () => {
  const files = ['src/index.ts', 'src/utils.ts', 'package.json', 'README.md', 'src/components/App.tsx'];

  it('returns completions after ./', () => {
    const completer = createFilePathCompleter(() => files);
    const result = completer(makeContext('./'));
    expect(result).not.toBeNull();
    expect(result!.options.length).toBeGreaterThan(0);
    const labels = result!.options.map((o: any) => o.label);
    expect(labels).toContain('src/');
    expect(labels).toContain('package.json');
    expect(labels).toContain('README.md');
  });

  it('returns completions after ../', () => {
    const completer = createFilePathCompleter(() => files);
    const result = completer(makeContext('../'));
    // ../ maps to no prefix, so all root items shown
    expect(result).not.toBeNull();
    expect(result!.options.length).toBeGreaterThan(0);
  });

  it('filters by prefix text', () => {
    const completer = createFilePathCompleter(() => files);
    const result = completer(makeContext('./p'));
    expect(result).not.toBeNull();
    const labels = result!.options.map((o: any) => o.label);
    expect(labels).toContain('package.json');
    expect(labels).not.toContain('README.md');
  });

  it('returns null for non-path input', () => {
    const completer = createFilePathCompleter(() => files);
    const result = completer(makeContext('hello world'));
    expect(result).toBeNull();
  });

  it('returns null when no files match', () => {
    const completer = createFilePathCompleter(() => []);
    const result = completer(makeContext('./'));
    expect(result).toBeNull();
  });

  it('completes subdirectories', () => {
    const completer = createFilePathCompleter(() => files);
    const result = completer(makeContext('./src/'));
    expect(result).not.toBeNull();
    const labels = result!.options.map((o: any) => o.label);
    expect(labels).toContain('index.ts');
    expect(labels).toContain('utils.ts');
    expect(labels).toContain('components/');
  });
});

// ── Snippet completer tests ─────────────────────────────────────────────────

describe('snippetCompleter', () => {
  it('returns JS snippets for .js files', () => {
    const langChangeHandlers: Array<(info: { languageId: string }) => void> = [];
    const completer = createSnippetCompleter(
      () => 'test.js',
      (cb) => { langChangeHandlers.push(cb); return { dispose: () => {} }; },
    );
    const result = completer(makeContext('con'));
    expect(result).not.toBeNull();
    expect(result!.options.length).toBeGreaterThan(0);
    const labels = result!.options.map((o: any) => o.label);
    expect(labels.some((l: string) => l.startsWith('console'))).toBe(true);
  });

  it('returns Python snippets for .py files', () => {
    const completer = createSnippetCompleter(
      () => 'app.py',
      (cb) => ({ dispose: () => {} }),
    );
    const result = completer(makeContext('def'));
    expect(result).not.toBeNull();
    const labels = result!.options.map((o: any) => o.label);
    expect(labels.some((l: string) => l.startsWith('def '))).toBe(true);
  });

  it('returns Go snippets for .go files', () => {
    const completer = createSnippetCompleter(
      () => 'main.go',
      (cb) => ({ dispose: () => {} }),
    );
    const result = completer(makeContext('fun'));
    expect(result).not.toBeNull();
    const labels = result!.options.map((o: any) as string => o.label);
    expect(labels.some((l: string) => l.startsWith('func '))).toBe(true);
  });

  it('returns CSS snippets for .css files', () => {
    const completer = createSnippetCompleter(
      () => 'style.css',
      (cb) => ({ dispose: () => {} }),
    );
    const result = completer(makeContext('dis'));
    expect(result).not.toBeNull();
    const labels = result!.options.map((o: any) => o.label);
    expect(labels.some((l: string) => l.startsWith('display'))).toBe(true);
  });

  it('returns null for short input (< 2 chars)', () => {
    const completer = createSnippetCompleter(
      () => 'test.js',
      (cb) => ({ dispose: () => {} }),
    );
    const result = completer(makeContext('i'));
    expect(result).toBeNull();
  });

  it('returns null when no snippets match', () => {
    const completer = createSnippetCompleter(
      () => 'test.js',
      (cb) => ({ dispose: () => {} }),
    );
    const result = completer(makeContext('xyz123'));
    expect(result).toBeNull();
  });

  it('updates language on onLanguageChanged', () => {
    const handlers: Array<(info: { languageId: string }) => void> = [];
    const completer = createSnippetCompleter(
      () => null,
      (cb) => { handlers.push(cb); return { dispose: () => {} }; },
    );

    // Initially javascript (default for null)
    let result = completer(makeContext('imp'));
    expect(result).not.toBeNull();

    // Switch to Python
    handlers.forEach((h) => h({ languageId: 'python' }));
    result = completer(makeContext('cla'));
    expect(result).not.toBeNull();
    const labels = result!.options.map((o: any) => o.label);
    expect(labels.some((l: string) => l.startsWith('class '))).toBe(true);
  });
});
