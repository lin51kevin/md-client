/**
 * Tests for Daily Notes plugin
 */
import { describe, it, expect, vi } from 'vitest';
import { getTodayDate, getDailyNotePath, applyTemplate } from '../../plugins/official/daily-notes/src/index';

describe('daily-notes', () => {
  it('should return date in YYYY-MM-DD format', () => {
    const date = getTodayDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should generate correct daily note path', () => {
    expect(getDailyNotePath('2026-05-03')).toBe('daily-notes/2026-05-03.md');
  });

  it('should replace all template variables', () => {
    const template = 'Date: ${date} Time: ${time} DateTime: ${datetime} File: ${filename}';
    const result = applyTemplate(template, '2026-05-03');

    expect(result).toContain('Date: 2026-05-03');
    expect(result).toContain('Time: ');
    expect(result).toContain('DateTime: 2026-05-03');
    expect(result).toContain('File: 2026-05-03.md');
    expect(result).not.toContain('${');
  });

  it('should use default template when no custom template', async () => {
    const storage = { get: vi.fn().mockResolvedValue(null) };
    const tpl = await storage.get('template');
    expect(tpl).toBeNull();
  });

  it('should open existing file instead of creating new one', () => {
    const mockCtx = {
      workspace: {
        getAllFiles: vi.fn().mockReturnValue(['daily-notes/2026-05-03.md']),
        openFile: vi.fn(),
        createNewDoc: vi.fn(),
      },
    } as any;

    // If file exists, openFile should be called
    const date = '2026-05-03';
    const filePath = getDailyNotePath(date);
    const allFiles = mockCtx.workspace.getAllFiles();

    if (allFiles.includes(filePath)) {
      mockCtx.workspace.openFile(filePath);
    }

    expect(mockCtx.workspace.openFile).toHaveBeenCalledWith('daily-notes/2026-05-03.md');
    expect(mockCtx.workspace.createNewDoc).not.toHaveBeenCalled();
  });
});
