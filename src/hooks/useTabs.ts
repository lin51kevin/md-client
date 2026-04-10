import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { message } from '@tauri-apps/plugin-dialog';
import { Tab } from '../types';
import { INITIAL_TAB_ID, genTabId, DEFAULT_MARKDOWN } from '../constants';
import { addRecentFile, removeRecentFile } from '../lib/recent-files';
import { moveSnapshots } from '../lib/version-history';
import type { TranslationKey } from '../i18n/zh-CN';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export function useTabs(t?: TFn) {
  // Fallback: if no t() provided, use identity (raw key)
  const tr = t ?? ((k: string) => k);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: INITIAL_TAB_ID, filePath: null, doc: DEFAULT_MARKDOWN, isDirty: false },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(INITIAL_TAB_ID);
  const activeTabIdRef = useRef<string>(INITIAL_TAB_ID);
  const tabsRef = useRef<Tab[]>([
    { id: INITIAL_TAB_ID, filePath: null, doc: DEFAULT_MARKDOWN, isDirty: false },
  ]);
  const openingPaths = useRef(new Set<string>());

  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);

  const getActiveTab = useCallback((): Tab =>
    tabs.find(t => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  );

  const getTabTitle = (tab: Tab): string => {
    // F013: 自定义显示名优先
    if (tab.displayName) return tab.isDirty ? tab.displayName + ' \u25cf' : tab.displayName;
    const name = tab.filePath
      ? (tab.filePath.split(/[\\/]/).pop() ?? tab.filePath)
      : 'sample.md';
    return tab.isDirty ? name + ' \u25cf' : name;
  };

  /** F013: 重命名 Tab — 有文件时重命名磁盘文件并更新 filePath，无文件时仅改显示名。返回 true 表示操作成功 */
  const renameTab = useCallback(async (id: string, newName: string): Promise<boolean> => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    // ── 文件名合法性校验 ──────────────────────────────────────────
    if (/[/\\]/.test(trimmed)) {
      await message(tr('rename.hasSlash'), { title: tr('rename.title'), kind: 'warning' });
      return false;
    }
    if (/[<>:"|?*\x00-\x1f]/.test(trimmed)) {
      await message(tr('rename.illegalChars'), { title: tr('rename.title'), kind: 'warning' });
      return false;
    }
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.||$)/i.test(trimmed)) {
      await message(tr('rename.reserved', { name: trimmed }), { title: tr('rename.title'), kind: 'warning' });
      return false;
    }
    if (/[. ]$/.test(trimmed)) {
      await message(tr('rename.trailingDotSpace'), { title: tr('rename.title'), kind: 'warning' });
      return false;
    }
    if (new TextEncoder().encode(trimmed).length > 255) {
      await message(tr('rename.tooLong'), { title: tr('rename.title'), kind: 'warning' });
      return false;
    }
    // ─────────────────────────────────────────────────────────────

    const tab = tabsRef.current.find(t => t.id === id);
    if (tab?.filePath) {
      const lastSep = Math.max(tab.filePath.lastIndexOf('/'), tab.filePath.lastIndexOf('\\'));
      const dir = tab.filePath.substring(0, lastSep);
      const sep = tab.filePath[lastSep];
      const newPath = dir + sep + trimmed;
      try {
        await invoke('rename_file', { old_path: tab.filePath, new_path: newPath });
        moveSnapshots(tab.filePath, newPath);
        setTabs(prev => prev.map(t =>
          t.id === id ? { ...t, filePath: newPath, displayName: undefined } : t
        ));
        removeRecentFile(tab.filePath);
        addRecentFile(newPath);
        return true;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.startsWith('FILE_EXISTS:')) {
          const conflictName = errMsg.slice('FILE_EXISTS:'.length);
          await message(tr('rename.alreadyExists', { name: conflictName }), { title: tr('rename.title'), kind: 'warning' });
        } else {
          await message(tr('rename.failed', { error: errMsg }), { title: tr('rename.title'), kind: 'error' });
        }
        return false;
      }
    } else {
      // 未保存文件，只改显示名
      setTabs(prev => prev.map(t => t.id === id ? { ...t, displayName: trimmed } : t));
      return true;
    }
  }, []);

  const updateActiveDoc = useCallback((value: string) => {
    setTabs(prev =>
      prev.map(t => t.id === activeTabId ? { ...t, doc: value, isDirty: true } : t)
    );
  }, [activeTabId]);

  const updateTabDoc = useCallback((tabId: string, value: string) => {
    setTabs(prev =>
      prev.map(t => t.id === tabId ? { ...t, doc: value, isDirty: true } : t)
    );
  }, []);

  const openFileInTab = useCallback(async (filePath: string) => {
    const existing = tabsRef.current.find(t => t.filePath === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    // Guard against concurrent opens of the same file (e.g. duplicate drop events)
    if (openingPaths.current.has(filePath)) return;
    openingPaths.current.add(filePath);

    try {
      const content = await invoke<string>('read_file_text', { path: filePath });
      // Re-check after async operation to handle concurrent calls with the same file
      const duplicate = tabsRef.current.find(t => t.filePath === filePath);
      if (duplicate) {
        setActiveTabId(duplicate.id);
        return;
      }
      // Replace the pristine backing tab (no file, not dirty, no custom name) instead of stacking
      const cur = tabsRef.current;
      const isPristineBacking = cur.length === 1 && !cur[0].filePath && !cur[0].isDirty && !cur[0].displayName;
      if (isPristineBacking) {
        setTabs([{ id: cur[0].id, filePath, doc: content, isDirty: false }]);
        setActiveTabId(cur[0].id);
      } else {
        const newTab: Tab = { id: genTabId(), filePath, doc: content, isDirty: false };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
      addRecentFile(filePath);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await message(tr('rename.cannotRead', { error: errMsg }), { title: tr('rename.openFileFailed'), kind: 'error' });
    } finally {
      openingPaths.current.delete(filePath);
    }
  }, []);

  const createNewTab = () => {
    const current = tabsRef.current;
    // 用户新建 → untitled + 序号，空内容
    const usedNames = new Set(current.map(t => getTabTitle(t).replace(/ \u25cf$/, '')));
    let name = 'untitled.md';
    if (usedNames.has(name)) {
      let i = 1;
      while (usedNames.has(`untitled${i}.md`)) i++;
      name = `untitled${i}.md`;
    }
    const newTab: Tab = { id: genTabId(), filePath: null, doc: '', isDirty: false, displayName: name };
    // Replace the pristine backing tab (no file, not dirty, no custom displayName = welcome state)
    const isPristineBacking = current.length === 1 && !current[0].filePath && !current[0].isDirty && !current[0].displayName;
    if (isPristineBacking) {
      setTabs([newTab]);
    } else {
      setTabs(prev => [...prev, newTab]);
    }
    setActiveTabId(newTab.id);
  };

  /** Set a custom display name on a tab without any filesystem side-effects */
  const setTabDisplayName = useCallback((id: string, name: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, displayName: name } : t));
  }, []);

  const closeTab = (id: string) => {
    const current = tabsRef.current;
    // F013: 固定标签不可关闭
    if (current.find(t => t.id === id)?.isPinned) return;
    if (current.length === 1) {
      setTabs([{ id: current[0].id, filePath: null, doc: DEFAULT_MARKDOWN, isDirty: false }]);
      return;
    }
    const idx = current.findIndex(t => t.id === id);
    const next = current.filter(t => t.id !== id);
    setTabs(next);
    if (id === activeTabIdRef.current) {
      setActiveTabId(next[Math.min(idx, next.length - 1)].id);
    }
  };

  /** F013: 固定标签页 */
  const pinTab = (id: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isPinned: true } : t));
  };

  /** F013: 取消固定标签页 */
  const unpinTab = (id: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isPinned: false } : t));
  };

  const reorderTabs = (fromId: string, toId: string) => {
    setTabs(prev => {
      const fromIdx = prev.findIndex(t => t.id === fromId);
      const toIdx = prev.findIndex(t => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      // Prevent dragging a non-pinned tab in front of a pinned tab
      if (!prev[fromIdx].isPinned && prev[toIdx].isPinned) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const openFileWithContent = useCallback((filePath: string, content: string) => {
    const existing = tabsRef.current.find(t => t.filePath === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    // If the only tab is an untouched Untitled, replace it instead of adding alongside
    const current = tabsRef.current;
    if (current.length === 1 && !current[0].filePath && !current[0].isDirty) {
      setTabs([{ id: current[0].id, filePath, doc: content, isDirty: false }]);
      setActiveTabId(current[0].id);
    } else {
      const newTab: Tab = { id: genTabId(), filePath, doc: content, isDirty: false };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
    addRecentFile(filePath);
  }, []);

  const markSaved = (id: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isDirty: false } : t));
  };

  const markSavedAs = (id: string, filePath: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, filePath, isDirty: false } : t));
  };

  return {
    tabs, activeTabId, setActiveTabId, activeTabIdRef,
    getActiveTab, getTabTitle, updateActiveDoc, updateTabDoc, openFileInTab, openFileWithContent,
    createNewTab, closeTab, reorderTabs, markSaved, markSavedAs,
    renameTab, setTabDisplayName,
    pinTab, unpinTab,
  };
}
