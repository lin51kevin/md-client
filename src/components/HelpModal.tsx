import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { X, ChevronRight, List } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { useI18n } from '../i18n';
import { extractToc, type TocEntry } from '../lib/toc';
// Vite ?raw import — USER_GUIDE.md bundled as a plain string
import userGuideZh from '../../docs/USER_GUIDE.md?raw';

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeSlug, rehypeHighlight];

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HelpModal({ visible, onClose }: HelpModalProps) {
  const { t } = useI18n();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Extract TOC from raw markdown (stable — content never changes)
  const toc = useMemo(() => extractToc(userGuideZh), []);

  // Build flat items with indent + hasChildren for sidebar rendering
  const items = useMemo(() => {
    const filtered = toc.filter(e => e.level <= 3);
    return filtered.map((entry, i) => ({
      ...entry,
      indent: (entry.level - 1) * 14,
      hasChildren: i + 1 < filtered.length && filtered[i + 1].level > entry.level,
    }));
  }, [toc]);

  // Visible items considering collapsed state
  const visibleItems = useMemo(() => {
    const result: typeof items = [];
    const stack: Array<{ level: number; collapsed: boolean }> = [];
    for (const item of items) {
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }
      const hidden = stack.some(s => s.collapsed);
      if (!hidden) result.push(item);
      stack.push({ level: item.level, collapsed: collapsedIds.has(item.id) });
    }
    return result;
  }, [items, collapsedIds]);

  // Scroll content area to heading by slug id
  const handleNavigate = useCallback((entry: TocEntry) => {
    const container = contentRef.current;
    if (!container) return;
    const target = container.querySelector(`#${CSS.escape(entry.id)}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(entry.id);
    }
  }, []);

  const toggleCollapse = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  // Track scroll position to highlight active TOC entry
  useEffect(() => {
    if (!visible) return;
    const container = contentRef.current;
    if (!container) return;
    const handleScroll = () => {
      const headings = container.querySelectorAll('h1[id], h2[id], h3[id]');
      let current: string | null = null;
      for (const heading of headings) {
        const rect = heading.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.top - containerRect.top <= 80) {
          current = heading.id;
        }
      }
      if (current !== activeId) setActiveId(current);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [visible, activeId]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[10000]"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          width: '85vw',
          maxWidth: 1100,
          height: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <h2
            className="text-base font-semibold m-0"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('help.title')}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* TOC Sidebar */}
          <div
            className="w-56 shrink-0 flex flex-col overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-color)',
            }}
          >
            <div
              className="shrink-0 flex items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <List size={14} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('toc.title')}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item)}
                  className="w-full text-left flex items-center gap-1 py-1 px-2 text-xs rounded-sm cursor-pointer"
                  style={{
                    paddingLeft: item.indent + 8,
                    color: activeId === item.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                    fontWeight: activeId === item.id ? 600 : item.level === 1 ? 500 : 400,
                    backgroundColor: activeId === item.id ? 'var(--hover-bg)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (activeId !== item.id) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = activeId === item.id ? 'var(--hover-bg)' : 'transparent';
                    e.currentTarget.style.color = activeId === item.id ? 'var(--accent-color)' : 'var(--text-secondary)';
                  }}
                >
                  {item.hasChildren && (
                    <span
                      className="flex items-center justify-center w-4 h-4 shrink-0"
                      onClick={(e) => toggleCollapse(item.id, e)}
                    >
                      <ChevronRight
                        size={12}
                        style={{
                          transform: collapsedIds.has(item.id) ? 'rotate(0deg)' : 'rotate(90deg)',
                          transition: 'transform 0.15s ease',
                          color: 'var(--text-secondary)',
                        }}
                      />
                    </span>
                  )}
                  {!item.hasChildren && <span className="w-4 shrink-0" />}
                  <span className="truncate">{item.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto px-8 py-6 preview-content"
            style={{ color: 'var(--text-primary)' }}
          >
            <ReactMarkdown
              remarkPlugins={REMARK_PLUGINS}
              rehypePlugins={REHYPE_PLUGINS}
            >
              {userGuideZh}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
