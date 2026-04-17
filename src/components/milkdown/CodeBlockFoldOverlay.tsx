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
  const { isCollapsed, toggle, blockId } = useCodeBlockFold();
  const { t } = useI18n();
  const observerRef = useRef<MutationObserver | null>(null);
  const syncingRef = useRef(false);

  const syncButtons = useCallback(() => {
    const container = containerRef.current;
    if (!container || syncingRef.current) return;

    syncingRef.current = true;
    // Pause observer during DOM manipulation to avoid infinite loop
    observerRef.current?.disconnect();

    try {
      const codeBlocks = container.querySelectorAll('.milkdown-code-block');
      codeBlocks.forEach((block) => {
        const el = block as HTMLElement;

        // Extract language and first line for stable id
        const langBtn = el.querySelector('.language-button, [data-element="code-block-lang-select"] button');
        const lang = langBtn?.textContent?.trim() ?? '';
        const codeEl = el.querySelector('.cm-content');
        const firstLine = codeEl?.textContent?.split('\n')[0] ?? '';
        const id = blockId(lang, firstLine);

        const collapsed = isCollapsed(id);

        // Sync data-folded attribute
        if (collapsed) {
          el.setAttribute('data-folded', 'true');
        } else {
          el.removeAttribute('data-folded');
        }

        // Insert into toolbar button group instead of absolute positioning
        let btn = el.querySelector('.code-block-fold-btn') as HTMLButtonElement | null;
        if (btn) {
          btn.textContent = collapsed ? '▶' : '▼';
          btn.title = t('settings.shortcuts.foldCodeBlock');
        } else {
          const toolsGroup = el.querySelector('.tools-button-group');
          btn = document.createElement('button');
          btn.className = 'code-block-fold-btn';
          btn.textContent = collapsed ? '▶' : '▼';
          btn.title = t('settings.shortcuts.foldCodeBlock');
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(id);
          });
          if (toolsGroup) {
            // Prepend before copy button
            toolsGroup.insertBefore(btn, toolsGroup.firstChild);
          } else {
            el.style.position = el.style.position || 'relative';
            el.appendChild(btn);
          }
        }
      });
    } finally {
      // Re-enable observer
      if (container && observerRef.current) {
        observerRef.current.observe(container, { childList: true, subtree: true });
      }
      syncingRef.current = false;
    }
  }, [containerRef, isCollapsed, toggle, blockId, t]);

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
      observerRef.current = null;
      container.querySelectorAll('.code-block-fold-btn').forEach(btn => btn.remove());
    };
  }, [containerRef, syncButtons]);

  return null;
}
