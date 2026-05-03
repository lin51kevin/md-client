import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { toErrorMessage } from '../../lib/utils/errors';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { extractToc, type TocEntry } from '../../lib/markdown';
import { tocToMindmap, sanitizeText } from '../../lib/markdown';
import { isMermaidAvailable, getMermaidRenderer } from '../../lib/markdown/mermaid-bridge';

interface MindmapViewProps {
  markdown: string;
  onClose: () => void;
  onNavigate?: (entry: TocEntry) => void;
}

let mindmapIdCounter = 0;

export function MindmapView({ markdown, onClose, onNavigate }: MindmapViewProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramId = useRef(`mindmap-${++mindmapIdCounter}`);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const tocEntries = useMemo(() => extractToc(markdown), [markdown]);
  const mermaidSyntax = useMemo(() => tocToMindmap(tocEntries), [tocEntries]);

  // Render mermaid diagram
  useEffect(() => {
    if (tocEntries.length === 0 || !canvasRef.current) return;

    let cancelled = false;
    setError(null);

    if (!isMermaidAvailable()) {
      setError('Mermaid plugin not available');
      return;
    }
    const renderer = getMermaidRenderer()!;
    renderer.init().then(() => {
      return renderer.render(diagramId.current, mermaidSyntax);
    }).then(({ svg }) => {
      if (!cancelled && canvasRef.current) {
        canvasRef.current.innerHTML = DOMPurify.sanitize(svg, {
          ADD_TAGS: ['foreignObject', 'use'],
          FORCE_BODY: false,
        });

        // Auto-fit: make SVG fill the container using viewBox + width/height
        const svgEl = canvasRef.current.querySelector('svg');
        if (svgEl) {
          // Ensure viewBox is set from the original dimensions
          const origW = parseFloat(svgEl.getAttribute('width') || '0');
          const origH = parseFloat(svgEl.getAttribute('height') || '0');
          const vb = svgEl.getAttribute('viewBox');
          if (!vb && origW > 0 && origH > 0) {
            svgEl.setAttribute('viewBox', `0 0 ${origW} ${origH}`);
          }
          // Remove fixed dimensions so SVG can scale freely
          svgEl.removeAttribute('width');
          svgEl.removeAttribute('height');
          svgEl.style.width = '100%';
          svgEl.style.height = '100%';
          svgEl.style.maxWidth = '100%';
          svgEl.style.maxHeight = '100%';
        }

        // Attach click handlers to text nodes for navigation
        if (onNavigate) {
          const textNodes = canvasRef.current.querySelectorAll('text');
          textNodes.forEach((textEl) => {
            const content = textEl.textContent?.trim();
            if (!content) return;
            // Compare against sanitized text because mermaid renders the sanitized version
            const matchEntry = tocEntries.find(e => sanitizeText(e.text) === content);
            if (matchEntry) {
              textEl.style.cursor = 'pointer';
              textEl.addEventListener('click', () => onNavigate(matchEntry));
            }
          });
        }
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(toErrorMessage(err));
      }
    });

    return () => { cancelled = true; };
  }, [mermaidSyntax, tocEntries, onNavigate]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Mouse wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => {
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          return Math.min(Math.max(z + delta, 0.3), 3);
        });
      }
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, []);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.2, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.2, 0.3)), []);
  const handleZoomReset = useCallback(() => setZoom(1), []);

  const isEmpty = tocEntries.length === 0;

  return (
    <div
      data-testid="mindmap-view"
      role="dialog"
      aria-modal="true"
      aria-label={t('mindmap.title')}
      className="fixed inset-0 z-[600] flex flex-col"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header toolbar */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-3 py-2"
        style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('mindmap.title')}
        </span>
        {!isEmpty && (
          <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>
            {t('mindmap.nodeCount', { count: tocEntries.length })}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            aria-label={t('mindmap.zoomIn')}
            title={t('mindmap.zoomIn')}
            className="shrink-0 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', padding: 3 }}
          >
            <ZoomIn size={14} strokeWidth={1.8} />
          </button>
          <button
            onClick={handleZoomOut}
            aria-label={t('mindmap.zoomOut')}
            title={t('mindmap.zoomOut')}
            className="shrink-0 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', padding: 3 }}
          >
            <ZoomOut size={14} strokeWidth={1.8} />
          </button>
          <button
            onClick={handleZoomReset}
            aria-label={t('mindmap.zoomReset')}
            title={t('mindmap.zoomReset')}
            className="shrink-0 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', padding: 3 }}
          >
            <RotateCcw size={14} strokeWidth={1.8} />
          </button>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            title={t('common.close')}
            className="shrink-0 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', padding: 3 }}
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </span>
      </div>

      {/* Content area */}
      <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('mindmap.empty')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {t('mindmap.emptyHint')}
            </p>
          </div>
        ) : error ? (
          <div className="text-sm" style={{ color: 'var(--text-danger, #e53e3e)', padding: 16 }}>
            {t('mindmap.renderError')}: {error}
          </div>
        ) : (
          <div
            data-testid="mindmap-canvas"
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              transform: zoom !== 1 ? `scale(${zoom})` : undefined,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          />
        )}
      </div>
    </div>
  );
}
