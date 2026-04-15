/**
 * CodeBlockFoldOverlay — observes code blocks in Milkdown preview and
 * injects fold/unfold toggle buttons. Uses useCodeBlockFold for state.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useCodeBlockFold } from '../../hooks/useCodeBlockFold';
import { useI18n } from '../../i18n';

interface Props {
  /** Root element of the Milkdown preview container */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function CodeBlockFoldOverlay({ containerRef }: Props) {
  const { isCollapsed, toggle, lineCount, blockId } = useCodeBlockFold();
  const { t } = useI18n();
  const observerRef = useRef<MutationObserver | null>(null);

  const syncButtons = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Remove old buttons
    container.querySelectorAll('.code-block-fold-btn').forEach(btn => btn.remove());

    // Find all code blocks
    const codeBlocks = container.querySelectorAll('.milkdown-code-block');
    codeBlocks.forEach((block) => {
      const el = block as HTMLElement;

      // Skip if already has a button
      if (el.querySelector('.code-block-fold-btn')) return;

      // Extract language and first line for stable id
      const langBtn = el.querySelector('.language-button, [data-element="code-block-lang-select"] button');
      const lang = langBtn?.textContent?.trim() ?? '';
      const codeEl = el.querySelector('.cm-content');
      const firstLine = codeEl?.textContent?.split('\n')[0] ?? '';
      const id = blockId(lang, firstLine);

      // Restore folded state
      if (isCollapsed(id)) {
        el.setAttribute('data-folded', 'true');
      }

      // Create fold button
      const btn = document.createElement('button');
      btn.className = 'code-block-fold-btn';
      btn.textContent = isCollapsed(id) ? t('settings.shortcuts.foldCodeBlock').split('/')[1]?.trim() ?? '▾' : '▾';
      // Use chevron as indicator
      btn.textContent = isCollapsed(id) ? '▶' : '▼';
      btn.title = isCollapsed(id) ? t('settings.shortcuts.foldCodeBlock') : t('settings.shortcuts.foldCodeBlock');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      });

      // Position: code-block has position relative from CSS
      el.style.position = el.style.position || 'relative';
      el.appendChild(btn);
    });
  }, [containerRef, isCollapsed, toggle, lineCount, blockId, t]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial sync
    syncButtons();

    // Observe DOM changes (Milkdown renders async)
    const observer = new MutationObserver(() => {
      syncButtons();
    });
    observer.observe(container, { childList: true, subtree: true });
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      // Cleanup buttons
      container.querySelectorAll('.code-block-fold-btn').forEach(btn => btn.remove());
    };
  }, [containerRef, syncButtons]);

  // Also re-sync when fold state changes
  useEffect(() => {
    syncButtons();
  }, [isCollapsed, syncButtons]);

  return null;
}
