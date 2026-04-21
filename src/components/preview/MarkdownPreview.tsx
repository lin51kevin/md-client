import { useState, useEffect, useMemo, useCallback, useRef, useId, memo } from "react";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import { invoke } from "@tauri-apps/api/core";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { PREVIEW_REMARK_PLUGINS, PREVIEW_REHYPE_PLUGINS } from "../../lib/markdown/pipeline";
import { MAX_IMAGE_CACHE } from "../../constants";
import { toErrorMessage } from "../../lib/utils/errors";
import { initMermaid } from "../../lib/markdown";
import { parseTable, type TableData } from "../../lib/markdown";
import { extractFrontmatter, type Frontmatter } from "../../lib/markdown/extensions";
import { TableEditor } from "../modal/TableEditor";
import { useI18n } from "../../i18n";

// Stable plugin arrays — imported from markdown-pipeline to ensure single source of truth
// and prevent ReactMarkdown from re-initializing the pipeline on each render.
const REMARK_PLUGINS = PREVIEW_REMARK_PLUGINS;
const REHYPE_PLUGINS = PREVIEW_REHYPE_PLUGINS;

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

// ── Large document thresholds ───────────────────────────────────────────────
/** Below this size, preview behaves normally */
const PREVIEW_NORMAL_LIMIT = 50 * 1024;   // 50 KB
/** Above NORMAL, below HEAVY → longer debounce */
const PREVIEW_HEAVY_LIMIT = 200 * 1024;   // 200 KB
/** Above HEAVY → much longer debounce + warning */
const PREVIEW_HUGE_LIMIT = 500 * 1024;    // 500 KB
/** Truncation point for huge documents */
const PREVIEW_TRUNCATE_AT = 100 * 1024;   // 100 KB

/** Module-level LRU cache for loaded images. Evicts oldest entries beyond MAX_IMAGE_CACHE. */
const imageCache = new Map<string, string>();

function imageCacheSet(key: string, value: string): void {
  // Delete-then-set keeps insertion order for LRU
  if (imageCache.has(key)) imageCache.delete(key);
  imageCache.set(key, value);
  // Evict oldest entries when cache is full
  if (imageCache.size > MAX_IMAGE_CACHE) {
    const oldest = imageCache.keys().next().value;
    if (oldest !== undefined) imageCache.delete(oldest);
  }
}

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  /** Absolute path of the file being previewed; used to resolve relative paths */
  filePath?: string;
  /** Called when the user clicks a relative link to a Markdown file */
  onOpenFile?: (absPath: string) => void;
  /** Called when table editing is confirmed — receives updated full content */
  onContentChange?: (newContent: string) => void;
  /** Called when user clicks a [[wiki-link]]; target is the link text */
  onWikiLinkNavigate?: (target: string) => void;
  /** Plugin-registered custom renderers keyed by node type (e.g. 'blockquote', 'p'). */
  pluginRenderers?: Map<string, unknown>;
}

/**
 * Resolve a relative path against the directory of the open document.
 * Works for both forward and back slashes on Windows.
 */
/**
 * Check if a path is absolute (Unix /home/user or Windows C:\)
 */
function isAbsolutePath(p: string): boolean {
  // Unix absolute path
  if (p.startsWith('/')) return true;
  // Windows absolute path (C:\, D:\, C:/, etc.)
  if (/^[a-zA-Z]:[/\\]/.test(p)) return true;
  return false;
}

function resolvePath(docFilePath: string, rel: string): string {
  // If src is already absolute, return as-is
  if (isAbsolutePath(rel)) return rel;

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
        imageCacheSet(absPath, dataUrl);
        setDataSrc(dataUrl);
      })
      .catch(() => {
        imageCacheSet(absPath, "");
        setDataSrc(""); // '' → browser broken-image placeholder
      });
  }, [docFilePath, src]);

  return <img src={dataSrc} alt={alt} {...props} />;
}

/**
 * Renders a mermaid code block directly to SVG via mermaid.render().
 * Uses dangerouslySetInnerHTML to avoid the markdown parser mangling SVG CSS.
 */
function MermaidBlock({ code }: { code: string }) {
  const divRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const id = `mermaid-${rawId.replace(/:/g, '')}`;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    initMermaid().then(({ default: mermaid }) => {
      return mermaid.render(id, code);
    }).then(({ svg }) => {
      if (!cancelled && divRef.current) {
        // DOMPurify v3 disallows foreignObject/use by default;
        // re-add them so Mermaid's node labels and edge arrows render correctly.
        // Event handlers and <script> tags are still stripped by DOMPurify.
        divRef.current.innerHTML = DOMPurify.sanitize(svg, {
          ADD_TAGS: ['foreignObject', 'use'],
          FORCE_BODY: false,
        });
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(toErrorMessage(err));
      }
    });
    return () => { cancelled = true; };
  }, [code, id]);

  if (error) {
    return (
      <div
        className="mermaid-error"
        style={{ color: 'red', padding: '8px', border: '1px solid red', borderRadius: '4px' }}
      >
        Mermaid render error: {error}
      </div>
    );
  }
  return <div ref={divRef} className="mermaid-diagram" />;
}

/**
 * FrontmatterPanel — 将 frontmatter 渲染为表格，不使用 dangerouslySetInnerHTML
 */
function FrontmatterPanel({ fm }: { fm: Frontmatter }) {
  const keys = Object.keys(fm);
  if (keys.length === 0) return null;
  return (
    <div className="frontmatter-block" aria-label="Document metadata">
      <table className="fm-table">
        <tbody>
          {keys.map((key) => {
            const val = fm[key];
            const display = Array.isArray(val)
              ? (val as string[]).join(', ')
              : String(val);
            return (
              <tr key={key}>
                <th className="fm-key">{key}</th>
                <td className="fm-val">{display}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * F008 + F007: Markdown 预览组件
 *
 * 渲染管线：
 *   1. mermaid 代码块 → MermaidBlock 组件（直接设置 innerHTML，跳过 markdown 解析器）
 *   2. 其余内容经 react-markdown 管线（GFM + Math + 高亮）
 */
/**
 * Custom URL transform for ReactMarkdown.
 *
 * The default sanitizer strips URLs whose "scheme" is not in a small allow-list
 * (http, https, mailto …). Windows absolute paths like `C:/Users/…` are
 * interpreted as having scheme `C:` and get removed → src="".
 *
 * This transform preserves:
 *  - Standard web URLs (http:, https:, mailto:, tel:)
 *  - Data URIs (data:)
 *  - Fragment anchors (#...)
 *  - Relative paths (no colon before first slash)
 *  - Windows absolute paths (single letter + colon + slash)
 *  - Unix absolute paths (leading /)
 *
 * It still rejects dangerous schemes like javascript:.
 */
const SAFE_URL_RE = /^(https?:|mailto:|tel:|data:|blob:|#)/i;
function safeUrlTransform(url: string): string {
  // Allow standard safe schemes
  if (SAFE_URL_RE.test(url)) return url;
  // Allow absolute paths: Unix (/...) or Windows (C:/... or C:\...)
  if (isAbsolutePath(url)) return url;
  // Allow relative paths — no colon at all, or colon appears after first /
  const colonIdx = url.indexOf(':');
  const slashIdx = url.indexOf('/');
  if (colonIdx < 0) return url;
  if (slashIdx >= 0 && slashIdx < colonIdx) return url;
  // Reject everything else (e.g. javascript:, vbscript:, unknown schemes)
  return '';
}

/** Node types whose built-in renderers cannot be overridden by plugins. */
const PROTECTED_NODE_TYPES = new Set(['img', 'a', 'code']);

export const MarkdownPreview = memo(function MarkdownPreview({
  content,
  className,
  filePath,
  onOpenFile,
  onContentChange,
  onWikiLinkNavigate,
  pluginRenderers,
}: MarkdownPreviewProps) {
  const { t } = useI18n();
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  /** Resets to 0 before each ReactMarkdown render pass to keep table indices aligned */
  const tableCounterRef = useRef(0);

  // ── Large-document handling ─────────────────────────────────────────────
  const contentSize = content.length;
  const isHuge = contentSize > PREVIEW_HUGE_LIMIT;

  // For huge documents: manual refresh mode
  const [manualContent, setManualContent] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);

  // For heavy/huge documents: extra debounce on top of the 300ms from useDocMetrics
  const [debouncedContent, setDebouncedContent] = useState(content);
  const prevContentRef = useRef(content);

  useEffect(() => {
    // If document is huge and we're in manual mode, skip auto-update
    if (isHuge && manualContent !== null) return;

    if (contentSize <= PREVIEW_NORMAL_LIMIT) {
      // Small doc: update immediately (already debounced 300ms upstream)
      setDebouncedContent(content);
    } else if (contentSize <= PREVIEW_HEAVY_LIMIT) {
      // Medium doc: add 700ms extra debounce (total ~1s)
      const id = setTimeout(() => setDebouncedContent(content), 700);
      return () => clearTimeout(id);
    } else if (contentSize <= PREVIEW_HUGE_LIMIT) {
      // Heavy doc: add 1700ms extra debounce (total ~2s)
      const id = setTimeout(() => setDebouncedContent(content), 1700);
      return () => clearTimeout(id);
    }
    // Huge: handled by manual refresh below
  }, [content, contentSize, isHuge, manualContent]);

  // When switching from huge to non-huge or vice versa, reset manual state
  useEffect(() => {
    if (!isHuge) {
      setManualContent(null);
      setShowFull(false);
    }
  }, [isHuge]);

  // Sync when tab changes (content ref jumps to a completely different string)
  // Moved from render body to useEffect to avoid setState during render (React concurrent mode safety)
  useEffect(() => {
    if (prevContentRef.current !== content && Math.abs(prevContentRef.current.length - content.length) > content.length * 0.5) {
      setDebouncedContent(content);
      setManualContent(null);
      setShowFull(false);
    }
    prevContentRef.current = content;
  }, [content]);

  const handleManualRefresh = useCallback(() => {
    setManualContent(content);
    setDebouncedContent(content);
  }, [content]);

  const handleExpandFull = useCallback(() => {
    setShowFull(true);
  }, []);

  // Determine what to render
  const effectiveContent = isHuge
    ? (manualContent ?? debouncedContent)
    : debouncedContent;

  const shouldTruncate = isHuge && !showFull && effectiveContent.length > PREVIEW_TRUNCATE_AT;
  const renderContent = shouldTruncate
    ? effectiveContent.slice(0, PREVIEW_TRUNCATE_AT)
    : effectiveContent;

  // 预解析文档中所有表格，按序号索引 — use renderContent for performance
  const allTables = useMemo<TableData[]>(() => {
    const tables: TableData[] = [];
    let searchFrom = 0;
    while (true) {
      const idx = renderContent.indexOf('|', searchFrom);
      if (idx < 0) break;
      const parsed = parseTable(renderContent, idx);
      if (parsed) {
        tables.push(parsed);
        searchFrom = parsed.rawEnd;
      } else {
        searchFrom = idx + 1;
      }
    }
    return tables;
  }, [renderContent]);

  // Frontmatter 元数据面板（仅在检测到 frontmatter 时显示）
  const frontmatter = useMemo(() => extractFrontmatter(renderContent), [renderContent]);

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
      // 绝对路径始终通过 Tauri read_file_bytes 加载（支持未保存标签页中的图片）
      if (isAbsolutePath(src)) {
        return <LocalImage docFilePath="" src={src} alt={alt} {...props} />;
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
      const isWikiLink = 'data-wiki-target' in props;
      const wikiTarget = (props as any)['data-wiki-target'] as string | undefined;

      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Wiki-link click → delegate to parent
        if (isWikiLink && wikiTarget) {
          e.preventDefault();
          onWikiLinkNavigate?.(wikiTarget);
          return;
        }

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
          onOpenFile?.(absPath);
        } else {
          openPath(absPath).catch(() => {});
        }
      };

      return (
        <a href={href} onClick={handleClick} {...props}>
          {children}
        </a>
      );
    };

    // ── Mermaid code blocks ───────────────────────────────────────────────────
    components.code = ({
      className,
      children,
      ...props
    }: React.ComponentPropsWithoutRef<"code">) => {
      if (/language-mermaid/.test(className ?? '')) {
        return <MermaidBlock code={String(children).trim()} />;
      }
      return <code className={className} {...props}>{children}</code>;
    };

    // ── Plugin-registered renderers ─────────────────────────────────────────
    if (pluginRenderers) {
      for (const [nodeType, renderFn] of pluginRenderers) {
        if (PROTECTED_NODE_TYPES.has(nodeType)) {
          continue; // Built-in renderers take priority
        }
        if (typeof renderFn !== 'function') continue;
        const DefaultElement = nodeType as keyof React.JSX.IntrinsicElements;
        components[nodeType] = (props: Record<string, unknown>) => {
          const defaultRender = (p: Record<string, unknown>) => {
            const { children: c, ...rest } = p;
            const El = DefaultElement as unknown as React.ElementType;
            return <El {...rest}>{c as React.ReactNode}</El>;
          };
          return (renderFn as (p: Record<string, unknown>) => React.ReactNode)({ ...props, defaultRender });
        };
      }
    }

    return components;
  }, [filePath, onOpenFile, onContentChange, onWikiLinkNavigate, allTables, pluginRenderers]);

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
      {/* Large document manual refresh banner */}
      {isHuge && (
        <div className="preview-large-doc-banner">
          <span>⚡ {t('preview.manualRefresh')}</span>
          <button
            onClick={handleManualRefresh}
            className="preview-large-doc-banner__btn"
          >
            {t('preview.refreshNow')}
          </button>
        </div>
      )}
      {/* Reset table index counter before each ReactMarkdown render pass */}
      {(tableCounterRef.current = 0) === 0 && null}
      {Object.keys(frontmatter).length > 0 && <FrontmatterPanel fm={frontmatter} />}
      <ReactMarkdown
        remarkPlugins={[...REMARK_PLUGINS]}
        rehypePlugins={[...REHYPE_PLUGINS]}
        urlTransform={safeUrlTransform}
        components={customComponents}
      >
        {renderContent}
      </ReactMarkdown>
      {/* Truncation expand button */}
      {shouldTruncate && (
        <div className="preview-truncation-expand">
          <p>
            {t('preview.truncated', { size: Math.round(PREVIEW_TRUNCATE_AT / 1024) })}
          </p>
          <button
            onClick={handleExpandFull}
            className="preview-truncation-expand__btn"
          >
            {t('preview.expandFull')}
          </button>
        </div>
      )}
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
