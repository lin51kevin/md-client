import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { message } from '@tauri-apps/plugin-dialog';
import { Tab } from '../types';
import { INITIAL_TAB_ID, genTabId, DEFAULT_MARKDOWN } from '../constants';
import { addRecentFile, removeRecentFile } from '../lib/recent-files';
import { moveSnapshots } from '../lib/version-history';
import type { TranslationKey } from '../i18n/zh-CN';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** Serialized tab state — only save structure, not content (read from disk on restore) */
interface SerializedTab {
  id: string;
  filePath: string | null;
  displayName?: string;
  isPinned?: boolean;
}

interface SerializedSession {
  tabs: SerializedTab[];
  activeTabId: string;
}

const SESSION_KEY = 'marklite-session-tabs';

export function useTabs(t?: TFn, onRecentChange?: () => void) {
  // Fallback: if no t() provided, use identity (raw key)
  const tr = t ?? ((k: string) => k);
  const notifyRecent = useCallback(() => onRecentChange?.(), [onRecentChange]);
  
  // Initialize from session if available
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: INITIAL_TAB_ID, filePath: null, doc: DEFAULT_MARKDOWN, isDirty: false },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(INITIAL_TAB_ID);
  const activeTabIdRef = useRef<string>(INITIAL_TAB_ID);
  const tabsRef = useRef<Tab[]>([
    { id: INITIAL_TAB_ID, filePath: null, doc: DEFAULT_MARKDOWN, isDirty: false },
  ]);
  const openingPaths = useRef(new Set<string>());

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (!saved) {
          setIsRestoringSession(false);
          return;
        }
        
        const session: SerializedSession = JSON.parse(saved);
        if (!session.tabs || session.tabs.length === 0) {
          setIsRestoringSession(false);
          return;
        }
        
        // Read file contents for all tabs with filePath
        const restoredTabs: Tab[] = [];
        for (const serialized of session.tabs) {
          if (serialized.filePath) {
            try {
              const content = await invoke<string>('read_file_text', { path: serialized.filePath });
              restoredTabs.push({
                id: serialized.id,
                filePath: serialized.filePath,
                doc: content,
                isDirty: false,
                displayName: serialized.displayName,
                isPinned: serialized.isPinned,
              });
            } catch (err) {
              // File no longer exists or can't be read — skip this tab
              console.warn(`Failed to restore tab ${serialized.filePath}:`, err);
            }
          } else {
            // Untitled tab (no filePath) — skip; these are transient welcome-page
            // tabs that were mistakenly saved by an older version of the app.
          }
        }
        
        if (restoredTabs.length > 0) {
          setTabs(restoredTabs);
          // Restore activeTabId if it exists in restored tabs
          const activeExists = restoredTabs.some(t => t.id === session.activeTabId);
          setActiveTabId(activeExists ? session.activeTabId : restoredTabs[0].id);
        }
      } catch (err) {
        console.warn('Failed to restore session:', err);
      } finally {
        setIsRestoringSession(false);
      }
    };
    
    restoreSession();
  }, []);
  
  // Persist session when tabs or activeTabId changes (debounced)
  useEffect(() => {
    // Skip persistence during restoration phase
    if (isRestoringSession) return;
    
    // Only save tabs that have a real file on disk — untitled tabs (sample.md welcome
    // state included) cannot be meaningfully restored and must never pollute the session.
    const tabsToSave = tabs.filter(tab => tab.filePath !== null);
    if (tabsToSave.length === 0) {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {}
      return;
    }
    
    // Serialize tabs (don't save dirty state or content)
    const session: SerializedSession = {
      tabs: tabsToSave.map(tab => ({
        id: tab.id,
        filePath: tab.filePath,
        displayName: tab.displayName,
        isPinned: tab.isPinned,
      })),
      activeTabId,
    };
    
    // Debounce writes to avoid excessive localStorage writes
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch (err) {
        console.warn('Failed to persist session:', err);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [tabs, activeTabId, isRestoringSession]);

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
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i.test(trimmed)) {
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
        await invoke('rename_file', { oldPath: tab.filePath, newPath: newPath });
        moveSnapshots(tab.filePath, newPath);
        setTabs(prev => prev.map(t =>
          t.id === id ? { ...t, filePath: newPath, displayName: undefined } : t
        ));
        removeRecentFile(tab.filePath);
        addRecentFile(newPath);
        notifyRecent();
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
  }, [tr, notifyRecent]);

  const updateActiveDoc = useCallback((value: string) => {
    setTabs(prev =>
      prev.map(t => t.id === activeTabId ? { ...t, doc: value, isDirty: true } : t)
    );
  }, [activeTabId]);

  const updateTab = useCallback((tabId: string, patch: Partial<Tab>) => {
    setTabs(prev =>
      prev.map(t => t.id === tabId ? { ...t, ...patch } : t)
    );
  }, []);

  const updateTabDoc = useCallback((tabId: string, value: string) => {
    setTabs(prev =>
      prev.map(t => t.id === tabId ? { ...t, doc: value, isDirty: true } : t)
    );
  }, []);

  const openFileInTab = useCallback(async (filePath: string) => {
    // Normalize separators for cross-platform path comparison
    const normPath = (p: string) => p.replace(/[\\/]+/g, '/');
    const normalized = normPath(filePath);
    const existing = tabsRef.current.find(t => t.filePath && normPath(t.filePath) === normalized);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    // Guard against concurrent opens of the same file (e.g. duplicate drop events)
    if (openingPaths.current.has(normalized)) return;
    openingPaths.current.add(normalized);

    try {
      const content = await invoke<string>('read_file_text', { path: filePath });
      // Re-check after async operation to handle concurrent calls with the same file
      const duplicate = tabsRef.current.find(t => t.filePath && normPath(t.filePath) === normalized);
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
      notifyRecent();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await message(tr('file.cannotRead', { error: errMsg }), { title: tr('file.openFileFailed'), kind: 'error' });
    } finally {
      openingPaths.current.delete(normalized);
    }
  }, [tr, notifyRecent]);

  const createNewTab = (initialContent?: string) => {
    const current = tabsRef.current;
    // 用户新建 → untitled + 序号，空内容
    const usedNames = new Set(current.map(t => getTabTitle(t).replace(/ \u25cf$/, '')));
    let name = 'untitled.md';
    if (usedNames.has(name)) {
      let i = 1;
      while (usedNames.has(`untitled${i}.md`)) i++;
      name = `untitled${i}.md`;
    }
    const hasContent = initialContent != null && initialContent.length > 0;
    const newTab: Tab = { id: genTabId(), filePath: null, doc: initialContent ?? '', isDirty: hasContent, displayName: name };
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

  /** Atomically close multiple tabs at once (avoids stale-ref overwrite when closing in a loop) */
  const closeMultipleTabs = (idsToClose: string[]) => {
    const current = tabsRef.current;
    const idsSet = new Set(idsToClose);
    // Exclude pinned tabs from closing
    const next = current.filter(t => !idsSet.has(t.id) || t.isPinned);
    if (next.length === 0) {
      // All tabs were closed: reset to a single blank tab
      const newTab: Tab = { id: genTabId(), filePath: null, doc: DEFAULT_MARKDOWN, isDirty: false };
      setTabs([newTab]);
      setActiveTabId(newTab.id);
    } else {
      setTabs(next);
      if (idsSet.has(activeTabIdRef.current)) {
        const idx = current.findIndex(t => t.id === activeTabIdRef.current);
        setActiveTabId(next[Math.min(idx, next.length - 1)].id);
      }
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
    const normPath = (p: string) => p.replace(/[\\/]+/g, '/');
    const normalized = normPath(filePath);
    const existing = tabsRef.current.find(t => t.filePath && normPath(t.filePath) === normalized);
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
    notifyRecent();
  }, [notifyRecent]);

  const markSaved = (id: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isDirty: false } : t));
  };

  const markSavedAs = (id: string, filePath: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, filePath, isDirty: false, displayName: undefined } : t));
    addRecentFile(filePath);
    notifyRecent();
  };

  return {
    tabs, activeTabId, setActiveTabId, activeTabIdRef, tabsRef,
    getActiveTab, getTabTitle, updateActiveDoc, updateTabDoc, updateTab, openFileInTab, openFileWithContent,
    createNewTab, closeTab, closeMultipleTabs, reorderTabs, markSaved, markSavedAs,
    renameTab, setTabDisplayName,
    pinTab, unpinTab,
  };
}
