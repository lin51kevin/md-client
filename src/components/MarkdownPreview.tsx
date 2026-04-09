import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkDirectiveRehype from 'remark-directive-rehype';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import { rehypeFilterInvalidElements } from '../lib/rehypeFilterInvalidElements';
import { renderMermaid } from '../lib/mermaid';

// Stable plugin arrays (module-level) to avoid unnecessary ReactMarkdown re-renders
const REMARK_PLUGINS = [remarkGfm, remarkDirective, remarkDirectiveRehype, remarkMath];
const REHYPE_PLUGINS = [rehypeHighlight, rehypeRaw, rehypeKatex, rehypeFilterInvalidElements];

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * F008 + F007: Markdown 预览组件
 *
 * 渲染管线：
 *   1. 检测 mermaid 代码块 → renderMermaid() 异步渲染为 SVG（防抖 200ms）
 *   2. 其余内容经 react-markdown 管线（GFM + Math + 高亮）
 */
export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const [renderedContent, setRenderedContent] = useState(content);
  const [mermaidRendering, setMermaidRendering] = useState(false);

  // Memo: 检测内容是否包含 mermaid 块，避免不必要的异步渲染
  const hasMermaidBlocks = useMemo(() =>
    /```mermaid\n([\s\S]*?)```/.test(content),
    [content]
  );

  // 异步渲染 Mermaid 图表（debounce via content change）
  useEffect(() => {
    if (!hasMermaidBlocks) {
      setRenderedContent(content);
      return;
    }

    // 短暂延迟避免编辑时频繁渲染
    setMermaidRendering(true);
    const timer = setTimeout(async () => {
      try {
        const result = await renderMermaid(content);
        setRenderedContent(result);
      } catch (err) {
        console.error('Mermaid render failed:', err);
        setRenderedContent(content);
      } finally {
        setMermaidRendering(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [content, hasMermaidBlocks]);

  // 无 mermaid 时同步更新，减少一次 unnecessary render
  useEffect(() => {
    if (!hasMermaidBlocks) {
      setRenderedContent(content);
    }
  }, [content, hasMermaidBlocks]);

  return (
    <div className={className}>
      {mermaidRendering && (
        <div className="text-xs text-slate-400 italic px-8 pt-2">
          🔄 正在渲染图表…
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  );
}
