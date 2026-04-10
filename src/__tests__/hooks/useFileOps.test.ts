import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileOps } from '../../hooks/useFileOps';
import { Tab } from '../../types';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../../lib/html-export', () => ({
  generateHtmlDocument: vi.fn(() => Promise.resolve('<html></html>')),
}));

describe('useFileOps', () => {
  let mockGetActiveTab: ReturnType<typeof vi.fn>;
  let mockOpenFileInTab: ReturnType<typeof vi.fn>;
  let mockMarkSaved: ReturnType<typeof vi.fn>;
  let mockMarkSavedAs: ReturnType<typeof vi.fn>;
  let mockTabs: Tab[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTabs = [
      { id: 'tab-1', filePath: '/path/file1.md', doc: '# Content 1', isDirty: false },
      { id: 'tab-2', filePath: null, doc: '# Content 2', isDirty: true },
    ];

    mockGetActiveTab = vi.fn(() => mockTabs[0]);
    mockOpenFileInTab = vi.fn();
    mockMarkSaved = vi.fn();
    mockMarkSavedAs = vi.fn();
  });

  const renderFileOps = () => {
    return renderHook(() => useFileOps({
      getActiveTab: mockGetActiveTab,
      tabs: mockTabs,
      openFileInTab: mockOpenFileInTab,
      markSaved: mockMarkSaved,
      markSavedAs: mockMarkSavedAs,
    }));
  };

  describe('handleOpenFile', () => {
    it('should open single file', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      vi.mocked(open).mockResolvedValue('/path/to/file.md');

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleOpenFile();
      });

      expect(open).toHaveBeenCalledWith({
        multiple: true,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      });
      expect(mockOpenFileInTab).toHaveBeenCalledWith('/path/to/file.md');
    });

    it('should open multiple files', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      vi.mocked(open).mockResolvedValue(['/file1.md', '/file2.md']);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleOpenFile();
      });

      expect(mockOpenFileInTab).toHaveBeenCalledTimes(2);
      expect(mockOpenFileInTab).toHaveBeenCalledWith('/file1.md');
      expect(mockOpenFileInTab).toHaveBeenCalledWith('/file2.md');
    });

    it('should handle dialog cancellation silently', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      vi.mocked(open).mockResolvedValue(null);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleOpenFile();
      });

      expect(mockOpenFileInTab).not.toHaveBeenCalled();
    });

    it('should handle errors silently', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      vi.mocked(open).mockRejectedValue(new Error('Dialog failed'));

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleOpenFile();
      });

      // Should not throw
      expect(mockOpenFileInTab).not.toHaveBeenCalled();
    });
  });

  describe('handleSaveFile', () => {
    it('should save existing file', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleSaveFile();
      });

      expect(invoke).toHaveBeenCalledWith('write_file_text', {
        path: '/path/file1.md',
        content: '# Content 1',
      });
      expect(mockMarkSaved).toHaveBeenCalledWith('tab-1');
    });

    it('should trigger save as for new files', async () => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(save).mockResolvedValue('/new/path.md');
      vi.mocked(invoke).mockResolvedValue(undefined);

      mockGetActiveTab.mockReturnValue(mockTabs[1]); // Unsaved tab

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleSaveFile();
      });

      expect(save).toHaveBeenCalled();
      expect(invoke).toHaveBeenCalledWith('write_file_text', {
        path: '/new/path.md',
        content: '# Content 2',
      });
      expect(mockMarkSavedAs).toHaveBeenCalledWith('tab-2', '/new/path.md');
    });

    it('should save specific tab by ID', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleSaveFile('tab-1');
      });

      expect(invoke).toHaveBeenCalledWith('write_file_text', {
        path: '/path/file1.md',
        content: '# Content 1',
      });
    });

    it('should show error message on save failure', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { message } = await import('@tauri-apps/plugin-dialog');
      
      vi.mocked(invoke).mockRejectedValue(new Error('Permission denied'));

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleSaveFile();
      });

      expect(message).toHaveBeenCalledWith(
        'Permission denied',
        { title: '保存失败', kind: 'error' }
      );
    });
  });

  describe('handleSaveAsFile', () => {
    it('should save file with new path', async () => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(save).mockResolvedValue('/new/location.md');
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleSaveAsFile();
      });

      expect(save).toHaveBeenCalledWith({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      expect(invoke).toHaveBeenCalledWith('write_file_text', {
        path: '/new/location.md',
        content: '# Content 1',
      });
      expect(mockMarkSavedAs).toHaveBeenCalledWith('tab-1', '/new/location.md');
    });

    it('should handle dialog cancellation', async () => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(save).mockResolvedValue(null);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleSaveAsFile();
      });

      expect(invoke).not.toHaveBeenCalled();
      expect(mockMarkSavedAs).not.toHaveBeenCalled();
    });

    it('should save specific tab by ID', async () => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(save).mockResolvedValue('/new.md');
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleSaveAsFile('tab-2');
      });

      expect(invoke).toHaveBeenCalledWith('write_file_text', {
        path: '/new.md',
        content: '# Content 2',
      });
    });

    it('should show error on save failure', async () => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const { message } = await import('@tauri-apps/plugin-dialog');
      
      vi.mocked(save).mockResolvedValue('/new.md');
      vi.mocked(invoke).mockRejectedValue(new Error('Disk full'));

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleSaveAsFile();
      });

      expect(message).toHaveBeenCalledWith(
        'Disk full',
        { title: '另存为失败', kind: 'error' }
      );
    });
  });

  describe('handleExport', () => {
    it('should warn on empty document', async () => {
      const { message } = await import('@tauri-apps/plugin-dialog');
      
      mockGetActiveTab.mockReturnValue({
        id: 'tab-empty',
        filePath: null,
        doc: '   ',
        isDirty: false,
      });

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleExportHtml();
      });

      expect(message).toHaveBeenCalledWith(
        '文档内容为空，无法导出。',
        { title: '提示', kind: 'warning' }
      );
    });

    it('should export to HTML', async () => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const { generateHtmlDocument } = await import('../../lib/html-export');
      
      vi.mocked(save).mockResolvedValue('/export.html');
      vi.mocked(invoke).mockResolvedValue(undefined);
      vi.mocked(generateHtmlDocument).mockResolvedValue('<html><body>Test</body></html>');

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleExportHtml();
      });

      expect(save).toHaveBeenCalledWith({
        filters: [{ name: 'HTML Document', extensions: ['html'] }],
      });
      expect(generateHtmlDocument).toHaveBeenCalledWith('# Content 1');
      expect(invoke).toHaveBeenCalledWith('write_file_text', {
        path: '/export.html',
        content: '<html><body>Test</body></html>',
      });
    });

    it('should handle export cancellation', async () => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(save).mockResolvedValue(null);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleExportHtml();
      });

      expect(invoke).not.toHaveBeenCalled();
    });

    it('should export to DOCX', async () => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(save).mockResolvedValue('/export.docx');
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleExportDocx();
      });

      expect(save).toHaveBeenCalledWith({
        filters: [{ name: 'Word Document', extensions: ['docx'] }],
      });
      expect(invoke).toHaveBeenCalledWith('export_document', {
        markdown: '# Content 1',
        output_path: '/export.docx',
        format: 'docx',
      });
    });

    it('should export to PDF', async () => {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      vi.mocked(save).mockResolvedValue('/export.pdf');
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleExportPdf();
      });

      expect(save).toHaveBeenCalledWith({
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
      });
      expect(invoke).toHaveBeenCalledWith('export_document', {
        markdown: '# Content 1',
        output_path: '/export.pdf',
        format: 'pdf',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing tab gracefully', async () => {
      mockGetActiveTab.mockReturnValue(undefined as any);

      const { result } = renderFileOps();

      // Should not throw
      await act(async () => {
        await result.current.handleSaveFile();
      });

      const { invoke } = await import('@tauri-apps/api/core');
      expect(invoke).not.toHaveBeenCalled();
    });

    it('should handle non-existent tab ID', async () => {
      const { result } = renderFileOps();

      await act(async () => {
        await result.current.handleSaveFile('non-existent');
      });

      const { invoke } = await import('@tauri-apps/api/core');
      expect(invoke).not.toHaveBeenCalled();
    });
  });
});
