import { describe, it, expect, vi } from 'vitest';
import {
  toolSearch,
  toolReplace,
  toolGetLines,
  toolReplaceLines,
  toolInsert,
  toolDeleteLines,
  toolGetOutline,
  toolRegexReplace,
} from '../../../../plugins/official/ai-copilot/src/tools/tauri-bridge';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('tauri-bridge', () => {
  describe('toolSearch', () => {
    it('calls invoke with correct parameters', async () => {
      const mockResult = {
        matches: [{ line_number: 1, line_content: 'test', match_start: 0, match_end: 4, context_before: [], context_after: [] }],
        total_matches: 1,
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      const result = await toolSearch('content', 'pattern', 3);

      expect(invoke).toHaveBeenCalledWith('tool_search', {
        content: 'content',
        pattern: 'pattern',
        context_lines: 3,
      });
      expect(result.total_matches).toBe(1);
    });

    it('uses default context_lines', async () => {
      vi.mocked(invoke).mockResolvedValue({ matches: [], total_matches: 0 });

      await toolSearch('content', 'pattern');

      expect(invoke).toHaveBeenCalledWith('tool_search', {
        content: 'content',
        pattern: 'pattern',
        context_lines: 2,
      });
    });
  });

  describe('toolReplace', () => {
    it('calls invoke with occurrence', async () => {
      const mockResult = { success: true, content: 'new', edits: [] };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      await toolReplace('content', 'old', 'new', 1);

      expect(invoke).toHaveBeenCalledWith('tool_replace', {
        content: 'content',
        search: 'old',
        replace: 'new',
        occurrence: 1,
      });
    });

    it('calls invoke without occurrence for all', async () => {
      const mockResult = { success: true, content: 'new', edits: [] };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      await toolReplace('content', 'old', 'new');

      expect(invoke).toHaveBeenCalledWith('tool_replace', {
        content: 'content',
        search: 'old',
        replace: 'new',
        occurrence: null,
      });
    });
  });

  describe('toolGetLines', () => {
    it('gets single line', async () => {
      vi.mocked(invoke).mockResolvedValue('line content');

      const result = await toolGetLines('content', 5);

      expect(invoke).toHaveBeenCalledWith('tool_get_lines', {
        content: 'content',
        start: 5,
        end: null,
      });
      expect(result).toBe('line content');
    });

    it('gets line range', async () => {
      vi.mocked(invoke).mockResolvedValue('line 1\nline 2');

      await toolGetLines('content', 5, 10);

      expect(invoke).toHaveBeenCalledWith('tool_get_lines', {
        content: 'content',
        start: 5,
        end: 10,
      });
    });
  });

  describe('toolGetOutline', () => {
    it('returns heading info', async () => {
      const mockHeadings = [
        { level: 1, text: 'Title', line_number: 1 },
        { level: 2, text: 'Subtitle', line_number: 5 },
      ];
      vi.mocked(invoke).mockResolvedValue(mockHeadings);

      const result = await toolGetOutline('# Title\n## Subtitle');

      expect(invoke).toHaveBeenCalledWith('tool_get_outline', {
        content: '# Title\n## Subtitle',
      });
      expect(result).toHaveLength(2);
    });
  });
});