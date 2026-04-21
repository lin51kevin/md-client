import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImportOps } from '../../hooks/useImportOps';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  message: vi.fn(),
  ask: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock html-import module
vi.mock('../../lib/markdown/html-import', () => ({
  htmlToMarkdown: vi.fn((html: string) => `# Converted\n\n${html.length} chars`),
  extractHtmlTitle: vi.fn(() => 'Mock Title'),
}));

// Mock Worker bridge (Worker cannot run in test environment)
vi.mock('../../lib/workers/html-import-bridge', () => ({
  convertHtmlInWorker: vi.fn((html: string) => ({
    promise: Promise.resolve({ markdown: `# Worker Converted\n\n${html.length} chars`, title: 'Mock' }),
    cancel: vi.fn(),
  })),
}));

// Mock toast context
const mockToast = {
  show: vi.fn(() => 'toast-1'),
  showProgress: vi.fn(() => 'toast-progress-1'),
  updateProgress: vi.fn(),
  dismiss: vi.fn(),
};
vi.mock('../../components/toast/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('useImportOps', () => {
  let mockCreateNewTab: ReturnType<typeof vi.fn>;
  let mockSetTabDisplayName: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNewTab = vi.fn();
    mockSetTabDisplayName = vi.fn();
    mockToast.show.mockReturnValue('toast-1');
    mockToast.showProgress.mockReturnValue('toast-progress-1');
  });

  const mockT = (key: string) => key;

  const renderImportOps = () =>
    renderHook(() =>
      useImportOps({
        createNewTab: mockCreateNewTab,
        setTabDisplayName: mockSetTabDisplayName,
        t: mockT as any,
      })
    );

  describe('handleImportHtml — 文件选择器导入', () => {
    it('应正确执行完整导入流程', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');

      (open as any).mockResolvedValue('C:\\docs\\page.html');
      (invoke as any).mockImplementation((cmd: string) => {
        if (cmd === 'get_file_size') return Promise.resolve(1024);
        if (cmd === 'read_file_text') return Promise.resolve('<h1>Hello</h1>');
        return Promise.resolve();
      });

      const { result } = renderImportOps();

      await act(async () => {
        await result.current.handleImportHtml();
      });

      expect(open).toHaveBeenCalled();
      expect(mockCreateNewTab).toHaveBeenCalled();
    });

    it('用户取消文件选择器时不应报错', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { message } = await import('@tauri-apps/plugin-dialog');

      (open as any).mockResolvedValue(null);

      const { result } = renderImportOps();

      await act(async () => {
        await result.current.handleImportHtml();
      });

      expect(mockCreateNewTab).not.toHaveBeenCalled();
      expect(message).not.toHaveBeenCalled();
    });

    it('导入失败时应显示错误消息', async () => {
      const { open, message } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');

      (open as any).mockResolvedValue('C:\\docs\\page.html');
      (invoke as any).mockImplementation((cmd: string) => {
        if (cmd === 'get_file_size') return Promise.resolve(1024);
        if (cmd === 'read_file_text') return Promise.reject(new Error('Read failed'));
        return Promise.resolve();
      });

      const { result } = renderImportOps();

      await act(async () => {
        await result.current.handleImportHtml();
      });

      expect(message).toHaveBeenCalled();
      expect(mockCreateNewTab).not.toHaveBeenCalled();
    });

    it('超过 200MB 的文件应被拒绝', async () => {
      const { open, message } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');

      (open as any).mockResolvedValue('C:\\docs\\huge.html');
      (invoke as any).mockImplementation((cmd: string) => {
        if (cmd === 'get_file_size') return Promise.resolve(201 * 1024 * 1024);
        return Promise.resolve();
      });

      const { result } = renderImportOps();

      await act(async () => {
        await result.current.handleImportHtml();
      });

      expect(message).toHaveBeenCalled();
      expect(mockCreateNewTab).not.toHaveBeenCalled();
    });

    it('importing 状态应在转换过程中为 true，完成后为 false', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');

      let resolveRead: ((v: string) => void) | null = null;
      (open as any).mockResolvedValue('C:\\docs\\page.html');
      (invoke as any).mockImplementation((cmd: string) => {
        if (cmd === 'get_file_size') return Promise.resolve(1024);
        if (cmd === 'read_file_text') return new Promise(r => { resolveRead = r; });
        return Promise.resolve();
      });

      const { result } = renderImportOps();
      expect(result.current.importing).toBe(false);

      await act(async () => {
        const p = result.current.handleImportHtml();
        // Wait a tick for state to update
        await new Promise(r => setTimeout(r, 0));
        resolveRead?.('<h1>Hello</h1>');
        await p;
      });

      // After completion, importing should be false
      expect(result.current.importing).toBe(false);
    });
  });

  describe('handleImportHtmlFromPath — 拖拽导入', () => {
    it('应跳过文件选择器直接导入', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');

      (invoke as any).mockImplementation((cmd: string) => {
        if (cmd === 'get_file_size') return Promise.resolve(2048);
        if (cmd === 'read_file_text') return Promise.resolve('<p>Dropped content</p>');
        return Promise.resolve();
      });

      const { result } = renderImportOps();

      await act(async () => {
        await result.current.handleImportHtmlFromPath('D:\\downloads\\page.html');
      });

      expect(open).not.toHaveBeenCalled();
      expect(mockCreateNewTab).toHaveBeenCalled();
    });

    it('大文件（≥256KB）应使用 Worker 路径并显示进度', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { convertHtmlInWorker } = await import('../../lib/workers/html-import-bridge');

      const bigContent = 'x'.repeat(512 * 1024); // 512 KB (>= 256KB threshold)
      (invoke as any).mockImplementation((cmd: string) => {
        if (cmd === 'get_file_size') return Promise.resolve(512 * 1024);
        if (cmd === 'read_file_text') return Promise.resolve(bigContent);
        return Promise.resolve();
      });

      const { result } = renderImportOps();

      await act(async () => {
        await result.current.handleImportHtmlFromPath('D:\\big.html');
      });

      expect(convertHtmlInWorker).toHaveBeenCalledWith(bigContent, expect.any(Function));
      expect(mockToast.showProgress).toHaveBeenCalled();
      expect(mockToast.dismiss).toHaveBeenCalled();
      expect(mockCreateNewTab).toHaveBeenCalled();
    });

    it('小文件（<256KB）应使用主线程同步路径，不走 Worker', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { convertHtmlInWorker } = await import('../../lib/workers/html-import-bridge');

      const smallContent = '<h1>Small</h1>';
      (invoke as any).mockImplementation((cmd: string) => {
        if (cmd === 'get_file_size') return Promise.resolve(1024);
        if (cmd === 'read_file_text') return Promise.resolve(smallContent);
        return Promise.resolve();
      });

      const { result } = renderImportOps();

      await act(async () => {
        await result.current.handleImportHtmlFromPath('D:\\small.html');
      });

      expect(convertHtmlInWorker).not.toHaveBeenCalled();
      expect(mockToast.showProgress).not.toHaveBeenCalled();
      expect(mockCreateNewTab).toHaveBeenCalled();
    });
  });

  describe('组件卸载时清理', () => {
    it('导入进行中组件卸载时应取消 Worker 操作', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { convertHtmlInWorker } = await import('../../lib/workers/html-import-bridge');

      const mockCancel = vi.fn();
      let resolvePromise: ((v: any) => void) | null = null;
      (convertHtmlInWorker as any).mockReturnValue({
        promise: new Promise(r => { resolvePromise = r; }),
        cancel: mockCancel,
      });
      (invoke as any).mockImplementation((cmd: string) => {
        if (cmd === 'get_file_size') return Promise.resolve(512 * 1024);
        if (cmd === 'read_file_text') return Promise.resolve('x'.repeat(512 * 1024));
        return Promise.resolve();
      });

      const { result, unmount } = renderImportOps();

      // Start import (will hang on Worker promise)
      await act(async () => {
        result.current.handleImportHtmlFromPath('D:\\big.html');
        // Wait for the import to start the Worker
        await new Promise(r => setTimeout(r, 0));
      });

      // Unmount while Worker is still running
      unmount();

      // cancel should have been called
      expect(mockCancel).toHaveBeenCalled();
    });
  });
});
