import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { parseSlides } from '../lib/slide-parser';

interface SlidePreviewProps {
  markdown: string;
  onClose: () => void;
}

export function SlidePreview({ markdown, onClose }: SlidePreviewProps) {
  const slides = useMemo(() => parseSlides(markdown), [markdown]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = slides.length;

  const goNext = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);

  const goFirst = useCallback(() => setCurrentSlide(0), []);
  const goLast = useCallback(() => setCurrentSlide(total - 1), [total]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goPrev();
          break;
        case 'Home':
          e.preventDefault();
          goFirst();
          break;
        case 'End':
          e.preventDefault();
          goLast();
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            document.exitFullscreen?.();
            setIsFullscreen(false);
          }
          onClose();
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) return;
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, goFirst, goLast, onClose, isFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen API not available or blocked
    }
  }, []);

  // Track fullscreen change events
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (total === 0) {
    return (
      <div className="slide-preview-empty" onClick={onClose}>
        <p>No slides found. Use "---" to separate slides.</p>
      </div>
    );
  }

  const currentContent = slides[currentSlide];
  const progress = total > 1 ? ((currentSlide + 1) / total) * 100 : 100;

  return (
    <div
      ref={containerRef}
      className={`slide-preview-container ${isFullscreen ? 'fullscreen' : ''}`}
      onClick={(e) => {
        // Click left half → prev, right half → next
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) goPrev();
        else goNext();
      }}
    >
      {/* Slide content */}
      <div className="slide-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {currentContent}
        </ReactMarkdown>
      </div>

      {/* Progress bar */}
      <div className="slide-progress-bar">
        <div className="slide-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Page number */}
      <div className="slide-page-number">
        {currentSlide + 1} / {total}
      </div>

      {/* Toolbar overlay */}
      <div className="slide-toolbar-overlay">
        <button className="slide-btn" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Fullscreen (F11)'}>
          {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
        <button className="slide-btn" onClick={(e) => { e.stopPropagation(); onClose(); }} title="Exit (ESC)">
          ✕
        </button>
      </div>
    </div>
  );
}
