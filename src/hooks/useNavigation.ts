import { useState, useCallback, type RefObject } from 'react';
import { EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';
import { confirm, message } from '@tauri-apps/plugin-dialog';
import type { Tab } from '../types';
import type { TranslationKey } from '../i18n';
import type { TocEntry } from '../lib/markdown';
import type { SearchResultItem } from '../types/search';
import { clearPreviewHighlight, buildSearchRegex, applyPreviewHighlight } from '../lib/utils/preview-highlight';

export interface SearchHighlightOpts {
  query: string;
  caseSensitive: boolean;
  regex: boolean;
  wholeWord: boolean;
}

interface UseNavigationOptions {
  cmViewRef: RefObject<EditorView | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  activeTab: Tab;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  getActiveTab: () => Tab;
  openFileInTab: (path: string) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  /** Ref kept up-to-date by SearchPanel with the current query/options */
  searchHighlightRef: RefObject<SearchHighlightOpts | null>;
}

export function useNavigation({
  cmViewRef, previewRef, activeTab, activeTabId, setActiveTabId,
  getActiveTab, openFileInTab, t, searchHighlightRef,
}: UseNavigationOptions) {
  const [activeTocId, setActiveTocId] = useState<string | null>(null);

  const handleTocNavigate = useCallback((entry: TocEntry) => {
    setActiveTocId(entry.id);
    const view = cmViewRef.current;
    if (view) {
      const pos = Math.min(entry.position, view.state.doc.length);
      view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 40 }) });
    }
    const previewEl = previewRef.current;
    if (previewEl) {
      const heading = previewEl.querySelector(`[id="${CSS.escape(entry.id)}"]`) as HTMLElement | null;
      if (heading) {
        const offset = heading.getBoundingClientRect().top - previewEl.getBoundingClientRect().top + previewEl.scrollTop;
        previewEl.scrollTo({ top: Math.max(0, offset - 40), behavior: 'smooth' });
      } else {
        const docLen = activeTab.doc.length;
        const ratio = docLen > 0 ? entry.position / docLen : 0;
        previewEl.scrollTo({ top: Math.max(0, ratio * (previewEl.scrollHeight - previewEl.clientHeight) - 40), behavior: 'smooth' });
      }
    }
  }, [cmViewRef, previewRef, activeTab.doc]);

  // [B1 FIX] Wiki-link navigation
  const handleWikiLinkNavigate = useCallback(async (target: string) => {
    const currentDir = getActiveTab()?.filePath?.replace(/[/\\][^/\\]+$/, '') ?? '';
    for (const name of [`${target}.md`, target]) {
      const candidatePath = currentDir ? `${currentDir}/${name}` : name;
      try { await invoke<string>('read_file_text', { path: candidatePath }); await openFileInTab(candidatePath); return; }
      catch { /* try next */ }
    }
    const yes = await confirm(`文档 "${target}" 未找到，是否创建？`, { title: t('wiki.create', { name: target }), kind: 'warning' });
    if (yes) {
      const newPath = currentDir ? `${currentDir}/${target}.md` : `${target}.md`;
      try { await invoke('create_file', { path: newPath }); await openFileInTab(newPath); }
      catch (e) { await message(e instanceof Error ? e.message : String(e), { title: t('fileOps.error'), kind: 'error' }); }
    }
  }, [getActiveTab, openFileInTab, t]);

  // Search result navigation
  const handleSearchResultClick = useCallback(async (result: SearchResultItem) => {
    const applyHighlight = () => {
      const previewEl = previewRef.current;
      if (!previewEl) return;
      const hl = searchHighlightRef.current;
      clearPreviewHighlight(previewEl);
      if (hl?.query) {
        const re = buildSearchRegex(hl.query, hl.caseSensitive, hl.regex, hl.wholeWord);
        if (re) applyPreviewHighlight(previewEl, re);
      }
    };

    const scrollTo = (sameTab: boolean) => {
      setTimeout(() => {
        const view = cmViewRef.current;
        // Only use the CM view if it is actually mounted in the DOM. In preview-only
        // or Milkdown mode the view has been destroyed and its dom node is detached,
        // so we must fall through to the preview-scroll fallback instead.
        if (view && view.dom.isConnected) {
          const lineInfo = view.state.doc.line(Math.max(0, result.line_number - 1) + 1);
          const anchor = lineInfo.from + result.match_start;
          view.dispatch({ selection: { anchor, head: lineInfo.from + result.match_end }, effects: EditorView.scrollIntoView(anchor, { y: 'center', yMargin: 40 }) });
          view.focus();
        } else {
          // Fallback for preview-only / milkdown mode: scroll to the highlighted element
          const previewEl = previewRef.current;
          if (previewEl) {
            const doc = getActiveTab().doc;
            const lines = doc.split('\n');
            const targetLine = Math.max(0, result.line_number - 1);
            let charPos = 0;
            for (let i = 0; i < Math.min(targetLine, lines.length); i++) {
              charPos += lines[i].length + 1; // +1 for '\n'
            }
            const targetCharPos = charPos + result.match_start;

            // Apply highlights and use DOM range positions for accurate scrolling
            const hl = searchHighlightRef.current;
            clearPreviewHighlight(previewEl);
            let scrolled = false;
            if (hl?.query) {
              const re = buildSearchRegex(hl.query, hl.caseSensitive, hl.regex, hl.wholeWord);
              if (re) {
                // Count occurrences before the target char position to get occurrence index
                const reCount = new RegExp(re.source, re.flags);
                let occurrenceIndex = 0;
                let m: RegExpExecArray | null;
                while ((m = reCount.exec(doc)) !== null) {
                  if (m.index >= targetCharPos) break;
                  occurrenceIndex++;
                  if (m[0].length === 0) reCount.lastIndex++;
                }

                const ranges = applyPreviewHighlight(previewEl, re);
                const targetRange = ranges[Math.min(occurrenceIndex, ranges.length - 1)];
                if (targetRange) {
                  try {
                    const rangeRect = targetRange.getBoundingClientRect();
                    const containerRect = previewEl.getBoundingClientRect();
                    const scrollTop = rangeRect.top - containerRect.top + previewEl.scrollTop - 40;
                    previewEl.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
                    scrolled = true;
                  } catch { /* getBoundingClientRect may fail for detached ranges */ }
                }
              }
            }

            if (!scrolled) {
              // Ratio-based fallback (approximate)
              const ratio = doc.length > 0 ? charPos / doc.length : 0;
              previewEl.scrollTo({ top: Math.max(0, ratio * (previewEl.scrollHeight - previewEl.clientHeight) - 40), behavior: 'smooth' });
            }
          }
          return; // highlights already applied above
        }
        // Apply highlight to the preview for all view modes so the clicked text
        // is visually marked regardless of whether the editor pane is visible.
        applyHighlight();
      }, sameTab ? 0 : 200);
    };
    if (result.tab_id) {
      const same = result.tab_id === activeTabId;
      if (!same) setActiveTabId(result.tab_id);
      scrollTo(same);
      return;
    }
    const isCurrentFile = !result.file_path || result.file_path === activeTab.filePath;
    if (!isCurrentFile) await openFileInTab(result.file_path);
    scrollTo(isCurrentFile);
  }, [cmViewRef, previewRef, getActiveTab, openFileInTab, activeTab.filePath, activeTabId, setActiveTabId, searchHighlightRef]);

  const clearSearchHighlight = useCallback(() => {
    const previewEl = previewRef.current;
    if (previewEl) clearPreviewHighlight(previewEl);
  }, [previewRef]);

  return {
    activeTocId,
    handleTocNavigate, handleWikiLinkNavigate, handleSearchResultClick,
    clearSearchHighlight,
  };
}
