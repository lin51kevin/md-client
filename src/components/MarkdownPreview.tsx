import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkDirectiveRehype from "remark-directive-rehype";
import remarkMath from "remark-math";
import remarkFootnotes from "remark-footnotes";
import remarkFrontmatter from "remark-frontmatter";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import "katex/dist/katex.min.css";
import { invoke } from "@tauri-apps/api/core";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { rehypeFilterInvalidElements } from "../lib/rehypeFilterInvalidElements";
import { renderMermaid } from "../lib/mermaid";
import { parseTable, type TableData } from "../lib/table-parser";
import { extractFrontmatter, buildFrontmatterHtml } from "../lib/markdown-extensions";
import { Pencil } from "lucide-react";
import { TableEditor } from "./TableEditor";
import { useI18n } from '../i18n';

// Stable plugin arrays (module-level) to avoid unnecessary ReactMarkdown re-renders
const REMARK_PLUGINS = [
  remarkGfm,
  remarkDirective,
  remarkDirectiveRehype,
  remarkMath,
  // ts-expect-error: remark-footnotes bundles duplicate vfile types (known issue)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  remarkFootnotes as any,
  remarkFrontmatter,
];
const REHYPE_PLUGINS = [
  rehypeSlug,
  rehypeHighlight,
  rehypeRaw,
  rehypeKatex,
  rehypeFilterInvalidElements,
];

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  bmp: "image/bmp",
};

const MD_EXTENSIONS = new Set(["md", "markdown", "txt"]);

/** Module-level cache to avoid re-loading the same image on every re-render */
const imageCache = new Map<string, string>();

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  /** Absolute path of the file being previewed; used to resolve relative paths */
  filePath?: string;
  /** Called when the user clicks a relative link to a Markdown file */
  onOpenFile?: (absPath: string) => void;
  /** Called when table editing is confirmed — receives updated full content */
  onContentChange?: (newContent: string) => void;
}

/**
 * Resolve a relative path against the directory of the open document.
 * Works for both forward and back slashes on Windows.
 */
function resolvePath(docFilePath: string, rel: string): string {
  const dir = docFilePath.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
  const parts = (dir + "/" + rel.replace(/\\/g, "/")).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }
  return resolved.join("/");
}

/**
 * Reads a local image via Tauri fs.readFile and renders it as a base64 data URL.
 * Works cross-platform in both dev and release without any asset protocol.
 */
function LocalImage({
  docFilePath,
  src,
  alt,
  ...props
}: {
  docFilePath: string;
  src: string;
  alt?: string;
} & Omit<React.ComponentPropsWithoutRef<"img">, "src">) {
  const [dataSrc, setDataSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    const absPath = resolvePath(docFilePath, src);
    const cached = imageCache.get(absPath);
    if (cached !== undefined) {
      setDataSrc(cached);
      return;
    }
    invoke<number[]>("read_file_bytes", { path: absPath })
      .then((numArray) => {
        const bytes = new Uint8Array(numArray);
        const ext = absPath.split(".").pop()?.toLowerCase() ?? "";
        const mime = MIME_MAP[ext] ?? "image/png";
        let binary = "";
        const CHUNK = 32768;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        const dataUrl = `data:${mime};base64,${btoa(binary)}`;
        imageCache.set(absPath, dataUrl);
        setDataSrc(dataUrl);
      })
      .catch(() => {
        imageCache.set(absPath, "");
        setDataSrc(""); // '' → browser broken-image placeholder
      });
  }, [docFilePath, src]);

  return <img src={dataSrc} alt={alt} {...props} />;
}

/**
 * F008 + F007: Markdown 预览组件
 *
 * 渲染管线：
 *   1. 检测 mermaid 代码块 → renderMermaid() 异步渲染为 SVG（防抖 200ms）
 *   2. 其余内容经 react-markdown 管线（GFM + Math + 高亮）
 */
export const MarkdownPreview = memo(function MarkdownPreview({
  content,
  className,
  filePath,
  onOpenFile,
  onContentChange,
}: MarkdownPreviewProps) {
  const { t } = useI18n();
  const [renderedContent, setRenderedContent] = useState(content);
  const [mermaidRendering, setMermaidRendering] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  /** Resets to 0 before each ReactMarkdown render pass to keep table indices aligned */
  const tableCounterRef = useRef(0);

  // 预解析文档中所有表格，按序号索引
  const allTables = useMemo<TableData[]>(() => {
    const tables: TableData[] = [];
    let searchFrom = 0;
    while (true) {
      const idx = content.indexOf('|', searchFrom);
      if (idx < 0) break;
      const parsed = parseTable(content, idx);
      if (parsed) {
        tables.push(parsed);
        searchFrom = parsed.rawEnd;
      } else {
        searchFrom = idx + 1;
      }
    }
    return tables;
  }, [content]);

  // Frontmatter 元数据面板（仅在检测到 frontmatter 时显示）
  const frontmatterHtml = useMemo(() => {
    const fm = extractFrontmatter(content);
    return buildFrontmatterHtml(fm);
  }, [content]);

  const customComponents = useMemo(() => {
    const components: Record<string, unknown> = {};

    // ── Image handling ────────────────────────────────────────────────────────
    components.img = ({
      src,
      alt,
      ...props
    }: React.ComponentPropsWithoutRef<"img">) => {
      if (!src || /^(https?:|data:|blob:)/.test(src)) {
        return <img src={src} alt={alt} {...props} />;
      }
      if (!filePath) return <img src={src} alt={alt} {...props} />;
      return (
        <LocalImage docFilePath={filePath} src={src} alt={alt} {...props} />
      );
    };

    // ── Link handling ─────────────────────────────────────────────────────────
    components.a = ({
      href,
      children,
      ...props
    }: React.ComponentPropsWithoutRef<"a">) => {
      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!href) return;

        // Fragment anchors — let the browser scroll the preview container
        if (href.startsWith("#")) return;

        e.preventDefault();

        // External URLs
        if (/^https?:/.test(href)) {
          openUrl(href).catch(() => {});
          return;
        }

        // Relative paths — resolve against the doc directory
        const absPath = filePath ? resolvePath(filePath, href) : href;
        const ext = absPath.split(".").pop()?.toLowerCase() ?? "";

        if (MD_EXTENSIONS.has(ext)) {
          // Open Markdown/text file in a new editor tab
          onOpenFile?.(absPath);
        } else {
          // Open other files (PDF, images, etc.) with the OS default app
          openPath(absPath).catch(() => {});
        }
      };

      return (
        <a href={href} onClick={handleClick} {...props}>
          {children}
        </a>
      );
    };

    // ── Table editing (with edit button overlay) ─────────────────────────────
    if (onContentChange) {
      components.table = ({
        children,
        ...props
      }: React.ComponentPropsWithoutRef<"table">) => {
        const currentIdx = tableCounterRef.current++;
        return (
          <div className="table-preview-wrapper" data-table-index={currentIdx}>
            <button
              className="table-edit-btn"
              onClick={() => {
                const parsed = allTables[currentIdx];
                if (parsed) setEditingTable(parsed);
              }}
              title={t('table.edit')}
            >
              <Pencil size={14} /> {t('table.edit')}
            </button>
            <table {...props}>{children}</table>
          </div>
        );
      };
    }

    return components;
  }, [filePath, onOpenFile, onContentChange, allTables]);

  // Memo: 检测内容是否包含 mermaid 块，避免不必要的异步渲染（兼容 LF/CRLF）
  const hasMermaidBlocks = useMemo(
    () => /```mermaid\r?\n([\s\S]*?)```/.test(content),
    [content],
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
      } catch {
        // Mermaid render failed — fall back to raw content
        setRenderedContent(content);
      } finally {
        setMermaidRendering(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [content, hasMermaidBlocks]);
  const handleTableConfirm = useCallback((newTableMd: string) => {
    if (!editingTable || !onContentChange) return;
    const newContent =
      content.slice(0, editingTable.rawStart) +
      newTableMd +
      content.slice(editingTable.rawEnd);
    onContentChange(newContent);
    setEditingTable(null);
  }, [editingTable, content, onContentChange]);

  return (
    <div className={className}>
      {/* Reset table index counter before each ReactMarkdown render pass */}
      {(tableCounterRef.current = 0) === 0 && null}
      {frontmatterHtml && (
        <div
          className="frontmatter-panel"
          dangerouslySetInnerHTML={{ __html: frontmatterHtml }}
        />
      )}
      {mermaidRendering && (
        <div className="text-xs italic px-8 pt-2" style={{ color: 'var(--text-tertiary)' }}>
          {t('mermaid.rendering')}
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={customComponents}
      >
        {renderedContent}
      </ReactMarkdown>
      {editingTable && (
        <TableEditor
          table={editingTable}
          onConfirm={handleTableConfirm}
          onCancel={() => setEditingTable(null)}
        />
      )}
    </div>
  );
});
