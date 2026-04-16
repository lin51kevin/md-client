import { describe, it, expect } from 'vitest';
import { executeInstructions } from '../../../plugins/official/ai-copilot/src/instruction-executor';

describe('instruction-executor', () => {
  const makeIdFactory = () => {
    let counter = 0;
    return () => `action-${++counter}`;
  };

  // ── Replace ─────────────────────────────────────────────────────────

  describe('replace', () => {
    it('converts a replace instruction to an EditAction', () => {
      const doc = 'Hello World\nThis is a test.\nGoodbye World';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'replace', search: 'Hello World', replace: 'Hi World' }],
        filePath: '/test.md',
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('replace');
      expect(result.actions[0].from).toBe(0);
      expect(result.actions[0].to).toBe(11);
      expect(result.actions[0].originalText).toBe('Hello World');
      expect(result.actions[0].newText).toBe('Hi World');
    });

    it('only replaces the first occurrence', () => {
      const doc = 'foo bar foo baz foo';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'replace', search: 'foo', replace: 'FOO' }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(true);
      expect(result.actions[0].from).toBe(0);
      expect(result.actions[0].to).toBe(3);
    });

    it('fails when search text is not found', () => {
      const doc = 'Hello World';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'replace', search: 'Not Found', replace: 'Replacement' }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(false);
      expect(result.actions).toHaveLength(0);
      expect(result.results[0].error).toContain('not found');
    });

    it('uses custom description when provided', () => {
      const doc = 'abc';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'replace', search: 'abc', replace: 'xyz', description: 'Custom desc' }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.actions[0].description).toBe('Custom desc');
    });
  });

  // ── Insert before / after ───────────────────────────────────────────

  describe('insert_before', () => {
    it('creates an insert action before the anchor', () => {
      const doc = 'Line 1\nLine 2\nLine 3';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'insert_before', anchor: 'Line 2', content: 'New Line\n' }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(true);
      expect(result.actions[0].type).toBe('insert');
      expect(result.actions[0].from).toBe(7); // position of "Line 2"
      expect(result.actions[0].newText).toBe('New Line\n');
    });

    it('fails when anchor is not found', () => {
      const doc = 'Hello';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'insert_before', anchor: 'Missing', content: 'X' }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(false);
      expect(result.actions).toHaveLength(0);
    });
  });

  describe('insert_after', () => {
    it('creates an insert action after the anchor', () => {
      const doc = '# Title\nContent';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'insert_after', anchor: '# Title', content: '\nSubtitle' }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(true);
      expect(result.actions[0].type).toBe('insert');
      expect(result.actions[0].from).toBe(7); // right after "# Title"
    });
  });

  // ── Delete ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it('creates a delete action', () => {
      const doc = 'Keep this\nRemove this\nKeep that';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'delete', target: 'Remove this\n' }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(true);
      expect(result.actions[0].type).toBe('delete');
      expect(result.actions[0].from).toBe(10);
      expect(result.actions[0].to).toBe(22);
      expect(result.actions[0].newText).toBe('');
    });

    it('fails when target is not found', () => {
      const doc = 'Hello';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'delete', target: 'Nothing' }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(false);
    });
  });

  // ── Multi ───────────────────────────────────────────────────────────

  describe('multi', () => {
    it('executes all steps and collects all actions', () => {
      const doc = 'aaa bbb ccc';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{
          type: 'multi',
          steps: [
            { type: 'replace', search: 'aaa', replace: 'AAA' },
            { type: 'replace', search: 'ccc', replace: 'CCC' },
          ],
        }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(true);
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].originalText).toBe('aaa');
      expect(result.actions[0].newText).toBe('AAA');
      expect(result.actions[1].originalText).toBe('ccc');
      expect(result.actions[1].newText).toBe('CCC');
    });

    it('reports partial failure when a step fails', () => {
      const doc = 'aaa bbb';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{
          type: 'multi',
          steps: [
            { type: 'replace', search: 'aaa', replace: 'AAA' },
            { type: 'replace', search: 'NOT_FOUND', replace: 'X' },
          ],
        }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(false);
      // Still returns the successful action
      expect(result.actions).toHaveLength(1);
    });

    it('handles empty multi steps', () => {
      const doc = 'hello';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [{ type: 'multi', steps: [] }],
        filePath: null,
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(false);
      expect(result.actions).toHaveLength(0);
    });
  });

  // ── Multiple top-level instructions ─────────────────────────────────

  describe('multiple instructions', () => {
    it('processes multiple instructions in sequence', () => {
      const doc = '# Title\n\nParagraph one.\n\nParagraph two.\n\n## Section';
      const result = executeInstructions({
        docSnapshot: doc,
        instructions: [
          { type: 'replace', search: '# Title', replace: '# Updated Title' },
          { type: 'replace', search: 'Paragraph one.', replace: 'Paragraph one (revised).' },
        ],
        filePath: '/doc.md',
        idFactory: makeIdFactory(),
      });

      expect(result.allSuccess).toBe(true);
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].sourceFilePath).toBe('/doc.md');
      expect(result.actions[1].sourceFilePath).toBe('/doc.md');
    });
  });

  // ── File path propagation ───────────────────────────────────────────

  it('propagates null filePath', () => {
    const doc = 'hello world';
    const result = executeInstructions({
      docSnapshot: doc,
      instructions: [{ type: 'replace', search: 'hello', replace: 'hi' }],
      filePath: null,
      idFactory: makeIdFactory(),
    });

    expect(result.actions[0].sourceFilePath).toBeNull();
  });

  // ── Empty instructions ──────────────────────────────────────────────

  it('handles empty instruction array', () => {
    const result = executeInstructions({
      docSnapshot: 'hello',
      instructions: [],
      filePath: null,
      idFactory: makeIdFactory(),
    });

    expect(result.allSuccess).toBe(true);
    expect(result.actions).toHaveLength(0);
    expect(result.results).toHaveLength(0);
  });

  // ── Description generation ──────────────────────────────────────────

  it('generates default description for replace when none provided', () => {
    const doc = 'The quick brown fox';
    const result = executeInstructions({
      docSnapshot: doc,
      instructions: [{ type: 'replace', search: 'quick brown fox', replace: 'slow red cat' }],
      filePath: null,
      idFactory: makeIdFactory(),
    });

    expect(result.actions[0].description).toContain('替换');
  });

  it('generates default description for insert', () => {
    const doc = '# Section';
    const result = executeInstructions({
      docSnapshot: doc,
      instructions: [{ type: 'insert_after', anchor: '# Section', content: 'body' }],
      filePath: null,
      idFactory: makeIdFactory(),
    });

    expect(result.actions[0].description).toContain('插入');
  });

  it('generates default description for delete', () => {
    const doc = 'remove me';
    const result = executeInstructions({
      docSnapshot: doc,
      instructions: [{ type: 'delete', target: 'remove me' }],
      filePath: null,
      idFactory: makeIdFactory(),
    });

    expect(result.actions[0].description).toContain('删除');
  });
});
