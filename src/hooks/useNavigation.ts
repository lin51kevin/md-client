import { useState, useCallback, type RefObject } from 'react';
import { EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';
import { confirm, message } from '@tauri-apps/plugin-dialog';
import type { Tab } from '../types';
import type { TranslationKey } from '../i18n';
import type { TocEntry } from '../lib/markdown';
import type { SearchResultItem } from '../types/search';

interface UseNavigationOptions {
  cmViewRef: RefObject<EditorView | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  activeTab: Tab;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  getActiveTab: () => Tab;
  openFileInTab: (path: string) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export function useNavigation({
  cmViewRef, previewRef, activeTab, activeTabId, setActiveTabId,
  getActiveTab, openFileInTab, t,
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
    const scrollTo = (sameTab: boolean) => {
      setTimeout(() => {
        const view = cmViewRef.current;
        if (!view) return;
        const lineInfo = view.state.doc.line(Math.max(0, result.line_number - 1) + 1);
        const anchor = lineInfo.from + result.match_start;
        view.dispatch({ selection: { anchor, head: lineInfo.from + result.match_end }, effects: EditorView.scrollIntoView(anchor, { y: 'center', yMargin: 40 }) });
        view.focus();
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
  }, [cmViewRef, openFileInTab, activeTab.filePath, activeTabId, setActiveTabId]);

  return {
    activeTocId,
    handleTocNavigate, handleWikiLinkNavigate, handleSearchResultClick,
  };
}
