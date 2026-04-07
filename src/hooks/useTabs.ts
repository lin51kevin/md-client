import { useState, useRef, useEffect, useCallback } from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { Tab } from '../types';
import { INITIAL_TAB_ID, genTabId, DEFAULT_MARKDOWN } from '../constants';

export function useTabs() {
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

  const getActiveTab = (): Tab => tabs.find(t => t.id === activeTabId) ?? tabs[0];

  const getTabTitle = (tab: Tab): string => {
    const name = tab.filePath
      ? (tab.filePath.split(/[\\/]/).pop() ?? tab.filePath)
      : 'Untitled.md';
    return tab.isDirty ? name + ' \u25cf' : name;
  };

  const updateActiveDoc = (value: string) => {
    setTabs(prev =>
      prev.map(t => t.id === activeTabId ? { ...t, doc: value, isDirty: true } : t)
    );
  };

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
      const content = await readTextFile(filePath);
      // Re-check after async operation to handle concurrent calls with the same file
      const duplicate = tabsRef.current.find(t => t.filePath === filePath);
      if (duplicate) {
        setActiveTabId(duplicate.id);
        return;
      }
      const newTab: Tab = { id: genTabId(), filePath, doc: content, isDirty: false };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (err) {
      console.error('Failed to read file', err);
    } finally {
      openingPaths.current.delete(filePath);
    }
  }, []);

  const createNewTab = () => {
    const newTab: Tab = { id: genTabId(), filePath: null, doc: '', isDirty: false };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (id: string) => {
    const current = tabsRef.current;
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

  const reorderTabs = (fromId: string, toId: string) => {
    setTabs(prev => {
      const fromIdx = prev.findIndex(t => t.id === fromId);
      const toIdx = prev.findIndex(t => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const markSaved = (id: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isDirty: false } : t));
  };

  const markSavedAs = (id: string, filePath: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, filePath, isDirty: false } : t));
  };

  return {
    tabs, activeTabId, setActiveTabId, activeTabIdRef,
    getActiveTab, getTabTitle, updateActiveDoc, openFileInTab,
    createNewTab, closeTab, reorderTabs, markSaved, markSavedAs,
  };
}
