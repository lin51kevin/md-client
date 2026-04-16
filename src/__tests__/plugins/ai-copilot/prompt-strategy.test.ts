import { describe, it, expect } from 'vitest';
import { choosePromptMode } from '../../../plugins/official/ai-copilot/src/prompt-strategy';
import type { ParsedIntent } from '../../../plugins/official/ai-copilot/src/intent-parser';

/** Helper to build a minimal ParsedIntent for testing. */
function makeIntent(overrides: Partial<ParsedIntent> & { action: ParsedIntent['action'] }): ParsedIntent {
  return {
    target: 'selection',
    params: {},
    confidence: 1,
    originalText: '',
    ...overrides,
  };
}

describe('prompt-strategy', () => {
  describe('choosePromptMode', () => {
    // ── Structured: polish ──

    it('returns "structured" for polish', () => {
      expect(choosePromptMode(makeIntent({ action: 'polish' }))).toBe('structured');
    });

    // ── Structured: edit with various modes ──

    it('returns "structured" for edit + mode=rewrite', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'rewrite' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=lint', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'lint' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=fix-links', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'fix-links' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=table-format', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'table-format' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=heading-promote', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'heading-promote' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=heading-demote', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'heading-demote' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=toc', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'toc' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=bold', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'bold' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=italic', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'italic' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=code', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'code' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=list', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'list' } }))).toBe('structured');
    });

    it('returns "structured" for edit + mode=heading', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'heading' } }))).toBe('structured');
    });

    it('returns "structured" for generic edit (no mode)', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit' }))).toBe('structured');
    });

    // ── Fulltext: edit with generative modes ──

    it('returns "fulltext" for edit + mode=expand', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'expand' } }))).toBe('fulltext');
    });

    it('returns "fulltext" for edit + mode=todo', () => {
      expect(choosePromptMode(makeIntent({ action: 'edit', params: { mode: 'todo' } }))).toBe('fulltext');
    });

    // ── Structured: format, delete ──

    it('returns "structured" for format', () => {
      expect(choosePromptMode(makeIntent({ action: 'format' }))).toBe('structured');
    });

    it('returns "structured" for delete', () => {
      expect(choosePromptMode(makeIntent({ action: 'delete' }))).toBe('structured');
    });

    // ── Fulltext: generative / informational ──

    it('returns "fulltext" for translate', () => {
      expect(choosePromptMode(makeIntent({ action: 'translate' }))).toBe('fulltext');
    });

    it('returns "fulltext" for insert', () => {
      expect(choosePromptMode(makeIntent({ action: 'insert' }))).toBe('fulltext');
    });

    it('returns "fulltext" for summarize', () => {
      expect(choosePromptMode(makeIntent({ action: 'summarize' }))).toBe('fulltext');
    });

    it('returns "fulltext" for explain', () => {
      expect(choosePromptMode(makeIntent({ action: 'explain' }))).toBe('fulltext');
    });

    it('returns "fulltext" for question', () => {
      expect(choosePromptMode(makeIntent({ action: 'question' }))).toBe('fulltext');
    });

    it('returns "fulltext" for create_document', () => {
      expect(choosePromptMode(makeIntent({ action: 'create_document' }))).toBe('fulltext');
    });
  });
});
