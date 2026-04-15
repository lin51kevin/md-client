import { describe, expect, it } from 'vitest';
import { createMarkdownSectionActions } from '../../../plugins/official/ai-copilot/src/markdown-actions';

describe('createMarkdownSectionActions', () => {
  it('splits by heading sections when possible', () => {
    const original = '# A\n\nold a\n\n# B\n\nold b';
    const modified = '# A\n\nnew a\n\n# B\n\nnew b';
    const actions = createMarkdownSectionActions({
      original,
      modified,
      baseFrom: 0,
      filePath: '/notes.md',
      idFactory: (i) => `id-${i}`,
    });

    expect(actions.length).toBeGreaterThanOrEqual(2);
    expect(actions[0].description).toContain('A');
  });

  it('falls back to single replace action for non-section markdown', () => {
    const original = 'plain text';
    const modified = 'plain text updated';
    const actions = createMarkdownSectionActions({
      original,
      modified,
      baseFrom: 10,
      filePath: '/notes.md',
      idFactory: (i) => `id-${i}`,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0].from).toBe(10);
    expect(actions[0].sourceFilePath).toBe('/notes.md');
  });
});
