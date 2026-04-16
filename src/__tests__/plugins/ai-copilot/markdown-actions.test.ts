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

  it('falls back to full replace when a new section is inserted', () => {
    const actions = createMarkdownSectionActions({
      original: '# A\n\nold a\n\n# B\n\nold b',
      modified: '# A\n\nold a\n\n# New\n\nnew section\n\n# B\n\nold b',
      baseFrom: 0,
      filePath: '/notes.md',
      idFactory: (i) => `id-${i}`,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0].description).toBe('替换全文');
  });

  it('produces section actions for reordered sections with differing text', () => {
    // When sections are reordered, the section texts differ (trailing whitespace
    // changes based on document position). The new behavior: if any section
    // text differs, emit a section-level action; fall back to full replace only
    // when no sections matched at all.
    const actions = createMarkdownSectionActions({
      original: '# A\n\nold a\n\n# B\n\nold b',
      modified: '# B\n\nold b\n\n# A\n\nold a',
      baseFrom: 0,
      filePath: '/notes.md',
      idFactory: (i) => `id-${i}`,
    });

    // Section A text differs (trailing \n\n removed), so a section action is emitted.
    // Section B is out-of-order and skipped.
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].type).toBe('replace');
  });
});
