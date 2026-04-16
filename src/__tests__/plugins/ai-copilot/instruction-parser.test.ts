import { describe, it, expect } from 'vitest';
import { detectResponseStrategy, parseEditInstructions } from '../../../plugins/official/ai-copilot/src/instruction-parser';

describe('instruction-parser', () => {
  // ── detectResponseStrategy ───────────────────────────────────────────

  describe('detectResponseStrategy', () => {
    it('detects structured JSON in a code block', () => {
      const raw = '```json\n[{ "type": "replace", "search": "hello", "replace": "world" }]\n```';
      expect(detectResponseStrategy(raw)).toBe('structured');
    });

    it('detects bare JSON array', () => {
      const raw = '[{ "type": "replace", "search": "hello", "replace": "world" }]';
      expect(detectResponseStrategy(raw)).toBe('structured');
    });

    it('detects empty JSON array as structured', () => {
      const raw = '[]';
      expect(detectResponseStrategy(raw)).toBe('structured');
    });

    it('falls back to text_replace for plain markdown', () => {
      const raw = '```markdown\n# Hello World\n\nThis is some text.\n```';
      expect(detectResponseStrategy(raw)).toBe('text_replace');
    });

    it('falls back to text_replace for plain text', () => {
      const raw = 'The quick brown fox jumps over the lazy dog.';
      expect(detectResponseStrategy(raw)).toBe('text_replace');
    });

    it('falls back to text_replace for invalid JSON', () => {
      const raw = '```json\n{ invalid json }\n```';
      expect(detectResponseStrategy(raw)).toBe('text_replace');
    });

    it('detects JSON in generic code block', () => {
      const raw = '```\n[{ "type": "replace", "search": "a", "replace": "b" }]\n```';
      expect(detectResponseStrategy(raw)).toBe('structured');
    });

    it('ignores non-array JSON objects', () => {
      const raw = '```json\n{ "type": "replace" }\n```';
      expect(detectResponseStrategy(raw)).toBe('text_replace');
    });
  });

  // ── parseEditInstructions ────────────────────────────────────────────

  describe('parseEditInstructions', () => {
    it('parses a single replace instruction from code block', () => {
      const raw = '```json\n[{ "type": "replace", "search": "hello world", "replace": "hello universe" }]\n```';
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].type).toBe('replace');
      if (result![0].type === 'replace') {
        expect(result![0].search).toBe('hello world');
        expect(result![0].replace).toBe('hello universe');
      }
    });

    it('parses multiple instructions', () => {
      const raw = `[\n  { "type": "replace", "search": "old title", "replace": "new title" },\n  { "type": "delete", "target": "remove this line" }\n]`;
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
    });

    it('parses insert_before instruction', () => {
      const raw = '[{ "type": "insert_before", "anchor": "# Section", "content": "## New Section\\n" }]';
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result![0].type).toBe('insert_before');
    });

    it('parses insert_after instruction', () => {
      const raw = '[{ "type": "insert_after", "anchor": "# Section", "content": "\\nSome text" }]';
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result![0].type).toBe('insert_after');
    });

    it('parses multi instruction', () => {
      const raw = `[{ "type": "multi", "steps": [\n    { "type": "replace", "search": "a", "replace": "b" },\n    { "type": "replace", "search": "c", "replace": "d" }\n  ]}]`;
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result![0].type).toBe('multi');
      if (result![0].type === 'multi') {
        expect(result![0].steps).toHaveLength(2);
      }
    });

    it('returns empty array for valid empty JSON array', () => {
      const raw = '```json\n[]\n```';
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(0);
    });

    it('returns null for non-structured responses', () => {
      const raw = 'Just some plain text response from the AI.';
      expect(parseEditInstructions(raw)).toBeNull();
    });

    it('skips invalid instruction types', () => {
      const raw = `[{ "type": "unknown_op", "search": "a" }, { "type": "replace", "search": "b", "replace": "c" }]`;
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].type).toBe('replace');
    });

    it('skips instructions with missing required fields', () => {
      const raw = `[{ "type": "replace" }, { "type": "replace", "search": "valid", "replace": "result" }]`;
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
    });

    it('skips non-object entries', () => {
      const raw = `["not an object", { "type": "replace", "search": "x", "replace": "y" }]`;
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
    });

    it('handles JSON with explanation text before the code block', () => {
      const raw = 'I will make the following changes:\n\n```json\n[{ "type": "replace", "search": "old", "replace": "new" }]\n```';
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
    });

    it('handles empty search in replace (should skip)', () => {
      const raw = '[{ "type": "replace", "search": "", "replace": "new" }]';
      const result = parseEditInstructions(raw);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(0);
    });
  });
});
