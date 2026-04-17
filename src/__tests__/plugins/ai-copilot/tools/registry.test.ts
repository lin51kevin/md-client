import { describe, it, expect, vi } from 'vitest';
import { TOOLS, TOOL_EXECUTORS } from '../../../../plugins/official/ai-copilot/src/tools/registry';

// Mock the bridge
vi.mock('../../../../plugins/official/ai-copilot/src/tools/tauri-bridge', () => ({
  toolSearch: vi.fn(),
  toolReplace: vi.fn(),
  toolGetLines: vi.fn(),
  toolReplaceLines: vi.fn(),
  toolInsert: vi.fn(),
  toolDeleteLines: vi.fn(),
  toolGetOutline: vi.fn(),
  toolRegexReplace: vi.fn(),
}));

import * as bridge from '../../../../plugins/official/ai-copilot/src/tools/tauri-bridge';

describe('Tool Registry', () => {
  describe('TOOLS definitions', () => {
    it('has 8 tools defined', () => {
      expect(TOOLS).toHaveLength(8);
    });

    it('each tool has required fields', () => {
      for (const tool of TOOLS) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.type).toBe('object');
        expect(Array.isArray(tool.parameters.required)).toBe(true);
      }
    });

    it('has expected tool names', () => {
      const names = TOOLS.map(t => t.name);
      expect(names).toContain('search');
      expect(names).toContain('replace');
      expect(names).toContain('get_lines');
      expect(names).toContain('replace_lines');
      expect(names).toContain('insert');
      expect(names).toContain('delete_lines');
      expect(names).toContain('get_outline');
      expect(names).toContain('regex_replace');
    });
  });

  describe('TOOL_EXECUTORS', () => {
    const docContent = 'test document content';

    describe('search executor', () => {
      it('calls toolSearch and formats result', async () => {
        vi.mocked(bridge.toolSearch).mockResolvedValue({
          matches: [
            { line_number: 1, line_content: 'found', match_start: 0, match_end: 5, context_before: [], context_after: [] },
          ],
          total_matches: 1,
        });

        const result = await TOOL_EXECUTORS.search({ pattern: 'test' }, docContent);

        expect(bridge.toolSearch).toHaveBeenCalledWith(docContent, 'test', undefined);
        expect(result.success).toBe(true);
        expect(result.content).toContain('找到 1 个匹配');
      });

      it('handles no matches', async () => {
        vi.mocked(bridge.toolSearch).mockResolvedValue({ matches: [], total_matches: 0 });

        const result = await TOOL_EXECUTORS.search({ pattern: 'notfound' }, docContent);

        expect(result.content).toBe('未找到匹配');
      });
    });

    describe('replace executor', () => {
      it('calls toolReplace with correct params', async () => {
        vi.mocked(bridge.toolReplace).mockResolvedValue({
          success: true,
          content: 'new content',
          edits: [{ from: 0, to: 4, insert: 'new' }],
        });

        const result = await TOOL_EXECUTORS.replace(
          { search: 'old', replace: 'new', occurrence: 1 },
          docContent
        );

        expect(bridge.toolReplace).toHaveBeenCalledWith(docContent, 'old', 'new', 1);
        expect(result.success).toBe(true);
        expect(result.content).toBe('new content');
      });
    });

    describe('get_lines executor', () => {
      it('returns line content', async () => {
        vi.mocked(bridge.toolGetLines).mockResolvedValue('line content here');

        const result = await TOOL_EXECUTORS.get_lines({ start: 5, end: 10 }, docContent);

        expect(bridge.toolGetLines).toHaveBeenCalledWith(docContent, 5, 10);
        expect(result.content).toBe('line content here');
      });
    });

    describe('get_outline executor', () => {
      it('formats heading outline', async () => {
        vi.mocked(bridge.toolGetOutline).mockResolvedValue([
          { level: 1, text: 'Title', line_number: 1 },
          { level: 2, text: 'Section', line_number: 5 },
        ]);

        const result = await TOOL_EXECUTORS.get_outline({}, docContent);

        expect(result.content).toContain('# Title');
        expect(result.content).toContain('  ## Section');
      });

      it('handles no headings', async () => {
        vi.mocked(bridge.toolGetOutline).mockResolvedValue([]);

        const result = await TOOL_EXECUTORS.get_outline({}, docContent);

        expect(result.content).toBe('文档没有标题');
      });
    });
  });
});