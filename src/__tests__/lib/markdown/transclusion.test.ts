/**
 * Tests for transclusion.ts — TDD: tests written first, implementation follows.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  resolveTransclusions,
  transclusionToPlaceholders,
  parseTransclusionMarker,
  extractHeadingSection,
} from '../transclusion';

// ── parseTransclusionMarker ────────────────────────────────────────────────

describe('parseTransclusionMarker', () => {
  it('parses simple file reference', () => {
    expect(parseTransclusionMarker('![[notes.md]]')).toEqual({ path: 'notes.md', heading: null });
  });

  it('parses file with heading', () => {
    expect(parseTransclusionMarker('![[notes.md#Summary]]')).toEqual({ path: 'notes.md', heading: 'Summary' });
  });

  it('returns null for invalid marker', () => {
    expect(parseTransclusionMarker('[[notes.md]]')).toBeNull();
    expect(parseTransclusionMarker('![]]')).toBeNull();
    expect(parseTransclusionMarker('')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseTransclusionMarker('![[ notes.md # Summary ]]')).toEqual({ path: 'notes.md', heading: 'Summary' });
  });
});

// ── transclusionToPlaceholders ─────────────────────────────────────────────

describe('transclusionToPlaceholders', () => {
  it('replaces single transclusion with placeholder', () => {
    const { markdown, placeholders } = transclusionToPlaceholders('Hello\n![[notes.md]]\nWorld');
    expect(markdown).toContain('<!-- TRANSCLUSION_0 -->');
    expect(markdown).not.toContain('![[notes.md]]');
    expect(placeholders.size).toBe(1);
  });

  it('replaces multiple transclusions', () => {
    const { markdown, placeholders } = transclusionToPlaceholders('![[a.md]] and ![[b.md]]');
    expect(placeholders.size).toBe(2);
    expect(markdown).toContain('<!-- TRANSCLUSION_0 -->');
    expect(markdown).toContain('<!-- TRANSCLUSION_1 -->');
  });

  it('returns empty map when no transclusions', () => {
    const { markdown, placeholders } = transclusionToPlaceholders('Just text');
    expect(markdown).toBe('Just text');
    expect(placeholders.size).toBe(0);
  });
});

// ── extractHeadingSection ──────────────────────────────────────────────────

describe('extractHeadingSection', () => {
  it('extracts ATX heading section', () => {
    const content = '# Title\n\nSome content\n\n## Sub\nSub content\n\n# Other\nOther content';
    const result = extractHeadingSection(content, 'Title');
    expect(result).toBe('# Title\n\nSome content\n\n## Sub\nSub content');
  });

  it('extracts nested heading', () => {
    const content = '# Title\n\n## Summary\nSummary content\n\n## Details\nDetails';
    const result = extractHeadingSection(content, 'Summary');
    expect(result).toBe('## Summary\nSummary content');
  });

  it('returns empty when heading not found', () => {
    const content = '# Title\nContent';
    expect(extractHeadingSection(content, 'Missing')).toBe('');
  });

  it('is case-insensitive', () => {
    const content = '# My Title\nContent';
    expect(extractHeadingSection(content, 'my title')).toBe('# My Title\nContent');
  });
});

// ── resolveTransclusions ───────────────────────────────────────────────────

describe('resolveTransclusions', () => {
  const readFile = vi.fn();
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    readFile.mockReset();
  });

  it('resolves simple file transclusion', async () => {
    readFile.mockResolvedValueOnce('# Included\nContent here');
    const result = await resolveTransclusions('Before\n![[notes.md]]\nAfter', readFile, workspaceRoot);
    expect(result).toBe('Before\n# Included\nContent here\nAfter');
    expect(readFile).toHaveBeenCalledWith('/workspace/notes.md');
  });

  it('resolves transclusion with heading', async () => {
    readFile.mockResolvedValueOnce('# Intro\nIntro text\n\n## Summary\nSummary text\n\n## Other\nOther');
    const result = await resolveTransclusions('![[notes.md#Summary]]', readFile, workspaceRoot);
    expect(result).toBe('## Summary\nSummary text');
  });

  it('leaves marker when file not found', async () => {
    readFile.mockResolvedValueOnce(null);
    const result = await resolveTransclusions('![[missing.md]]', readFile, workspaceRoot);
    expect(result).toBe('![[missing.md]]');
  });

  it('leaves marker when heading not found', async () => {
    readFile.mockResolvedValueOnce('# Title\nContent');
    const result = await resolveTransclusions('![[notes.md#Missing]]', readFile, workspaceRoot);
    expect(result).toBe('![[notes.md#Missing]]');
  });

  it('handles absolute paths', async () => {
    readFile.mockResolvedValueOnce('Absolute content');
    const result = await resolveTransclusions('![[/other/file.md]]', readFile, workspaceRoot);
    expect(readFile).toHaveBeenCalledWith('/other/file.md');
    expect(result).toBe('Absolute content');
  });

  it('resolves multiple transclusions', async () => {
    readFile.mockResolvedValueOnce('AAA').mockResolvedValueOnce('BBB');
    const result = await resolveTransclusions('![[a.md]] and ![[b.md]]', readFile, workspaceRoot);
    expect(result).toBe('AAA and BBB');
  });

  it('prevents deep recursion', async () => {
    // Content includes itself — should stop at maxDepth
    readFile.mockImplementation(async (path: string) => {
      if (path === '/workspace/self.md') return '![[self.md]]';
      return null;
    });
    const result = await resolveTransclusions('![[self.md]]', readFile, workspaceRoot, 2);
    // After 2 levels of recursion, marker remains
    expect(result).toBe('![[self.md]]');
  });

  it('returns original when no transclusions', async () => {
    const src = 'Just plain text';
    const result = await resolveTransclusions(src, readFile, workspaceRoot);
    expect(result).toBe(src);
    expect(readFile).not.toHaveBeenCalled();
  });
});
