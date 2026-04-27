import { describe, expect, it } from 'vitest';
import {
  planEditActions,
  shouldBuildEditActions,
} from '../../../plugins/official/ai-copilot/src/edit-action-planner';
import type { EditorContext } from '../../../plugins/official/ai-copilot/src/providers/types';

const baseContext: EditorContext = {
  filePath: '/notes.md',
  content: '# Title\n\nBody',
  cursor: { line: 3, column: 1, offset: 14 },
};

describe('planEditActions', () => {
  it('only enables editable actions for edit-like intents', () => {
    expect(shouldBuildEditActions('edit')).toBe(true);
    expect(shouldBuildEditActions('insert')).toBe(true);
    expect(shouldBuildEditActions('polish')).toBe(true);
    expect(shouldBuildEditActions('format')).toBe(true);
    expect(shouldBuildEditActions('translate')).toBe(true);
    expect(shouldBuildEditActions('explain')).toBe(false);
    expect(shouldBuildEditActions('summarize')).toBe(false);
    expect(shouldBuildEditActions('question')).toBe(false);
  });

  it('returns a replace action when selection exists', () => {
    const actions = planEditActions({
      response: '```json\n{"operation":"replace_selection","content":"Updated text"}\n```',
      editorCtx: {
        ...baseContext,
        selection: { from: 2, to: 6, text: 'Titl' },
      },
      scope: 'selection',
      idFactory: (index) => `id-${index}`,
    });

    expect(actions).toEqual([
      {
        id: 'id-0',
        type: 'replace',
        description: '替换 "Titl" → "Updated text"',
        from: 2,
        to: 6,
        originalText: 'Titl',
        newText: 'Updated text',
        sourceFilePath: '/notes.md',
      },
    ]);
  });

  it('returns an insert action at cursor when selection is empty', () => {
    const actions = planEditActions({
      response: '```json\n{"operation":"insert_at_cursor","content":"Inserted"}\n```',
      editorCtx: baseContext,
      scope: 'document',
      idFactory: (index) => `id-${index}`,
    });

    expect(actions).toEqual([
      {
        id: 'id-0',
        type: 'insert',
        description: '在光标处插入 "Inserted"',
        from: 14,
        to: 14,
        originalText: '',
        newText: 'Inserted',
        sourceFilePath: '/notes.md',
      },
    ]);
  });

  it('returns no actions for workspace scope', () => {
    const actions = planEditActions({
      response: '```markdown\nIgnored\n```',
      editorCtx: baseContext,
      scope: 'workspace',
      idFactory: (index) => `id-${index}`,
    });

    expect(actions).toEqual([]);
  });

  it('returns a full-replace action when response is plain text (raw fallback)', () => {
    const actions = planEditActions({
      response: 'plain assistant text',
      editorCtx: baseContext,
      scope: 'document',
      idFactory: (index) => `id-${index}`,
    });

    // The raw text fallback returns content with replace_selection operation,
    // which triggers the section-diff path → full replace since no sections matched.
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('replace');
  });

  it('keeps document rewrite flow for tab scope', () => {
    const actions = planEditActions({
      response: '```json\n{"operation":"rewrite_document","content":"Plain text updated"}\n```',
      editorCtx: {
        ...baseContext,
        content: 'Plain text',
        filePath: '/other.md',
      },
      scope: 'tab',
      idFactory: (index) => `id-${index}`,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      id: 'id-0',
      type: 'replace',
      from: 0,
      to: 10,
      originalText: 'Plain text',
      newText: 'Plain text updated',
      sourceFilePath: '/other.md',
    });
  });
});

describe('planEditActions delete intent', () => {
  it('returns a delete action immediately when intentAction=delete and selection exists', () => {
    const actions = planEditActions({
      response: '',
      editorCtx: {
        ...baseContext,
        selection: { from: 9, to: 14, text: '\n\nBody' },
      },
      scope: 'selection',
      intentAction: 'delete',
      idFactory: (index) => `id-${index}`,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      type: 'delete',
      from: 9,
      to: 14,
      originalText: '\n\nBody',
      newText: '',
    });
  });

  it('delete action description shows line count for multi-line selection', () => {
    const actions = planEditActions({
      response: '',
      editorCtx: {
        ...baseContext,
        selection: { from: 0, to: 14, text: '# Title\n\nBody' },
      },
      scope: 'selection',
      intentAction: 'delete',
      idFactory: (index) => `id-${index}`,
    });

    expect(actions[0].description).toMatch(/3 行/);
  });

  it('delete action description shows preview for single-line selection', () => {
    const actions = planEditActions({
      response: '',
      editorCtx: {
        ...baseContext,
        selection: { from: 0, to: 7, text: '# Title' },
      },
      scope: 'selection',
      intentAction: 'delete',
      idFactory: (index) => `id-${index}`,
    });

    expect(actions[0].description).toContain('Title');
  });

  it('falls through to AI path when intentAction=delete but no selection', () => {
    // Without selection the planner must parse an AI response
    const actions = planEditActions({
      response: '```json\n{"operation":"rewrite_document","content":"# Title"}\n```',
      editorCtx: baseContext,
      scope: 'document',
      intentAction: 'delete',
      idFactory: (index) => `id-${index}`,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('replace');
  });
});
