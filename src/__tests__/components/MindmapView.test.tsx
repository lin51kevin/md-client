import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MindmapView } from '../../components/MindmapView';

// Mock mermaid to avoid actual rendering in tests
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mermaid-svg"><text>Mock SVG</text></svg>' }),
  },
}));

// Mock i18n
vi.mock('../../i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'mindmap.title': '思维导图',
        'mindmap.empty': '未找到标题',
        'mindmap.emptyHint': '在文档中添加 # 标题以生成思维导图',
        'mindmap.zoomIn': '放大',
        'mindmap.zoomOut': '缩小',
        'mindmap.zoomReset': '重置缩放',
        'common.close': '关闭',
      };
      if (key === 'mindmap.nodeCount' && vars) return `${vars.count} 个节点`;
      return map[key] ?? key;
    },
  })),
}));

describe('MindmapView', () => {
  const markdownWithHeadings = `# 第一章\n## 第一节\n### 详细内容\n## 第二节\n# 第二章`;
  const emptyMarkdown = 'This is just plain text without any headings.';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染思维导图容器', () => {
    render(<MindmapView markdown={markdownWithHeadings} onClose={() => {}} />);
    expect(screen.getByTestId('mindmap-view')).toBeInTheDocument();
  });

  it('空文档（无标题）显示空状态提示', () => {
    render(<MindmapView markdown={emptyMarkdown} onClose={() => {}} />);
    expect(screen.getByText('未找到标题')).toBeInTheDocument();
    expect(screen.getByText('在文档中添加 # 标题以生成思维导图')).toBeInTheDocument();
  });

  it('有标题的文档渲染 Mermaid 内容', async () => {
    render(<MindmapView markdown={markdownWithHeadings} onClose={() => {}} />);
    // Mermaid render is async, wait for SVG to appear
    await waitFor(() => {
      const container = screen.getByTestId('mindmap-canvas');
      expect(container.innerHTML).toContain('svg');
    });
  });

  it('点击关闭按钮调用 onClose', () => {
    const onClose = vi.fn();
    render(<MindmapView markdown={markdownWithHeadings} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('关闭'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESC 键调用 onClose', () => {
    const onClose = vi.fn();
    render(<MindmapView markdown={markdownWithHeadings} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('显示缩放控制按钮', () => {
    render(<MindmapView markdown={markdownWithHeadings} onClose={() => {}} />);
    expect(screen.getByTitle('放大')).toBeInTheDocument();
    expect(screen.getByTitle('缩小')).toBeInTheDocument();
    expect(screen.getByTitle('重置缩放')).toBeInTheDocument();
  });

  it('显示标题节点数量', () => {
    render(<MindmapView markdown={markdownWithHeadings} onClose={() => {}} />);
    // 5 headings in markdownWithHeadings
    expect(screen.getByText('5 个节点')).toBeInTheDocument();
  });
});
