/**
 * useEditorSession — aggregates editor session hooks for AppShell.
 *
 * Combines editor core, plugin runtime, plugin panels, preview renderers,
 * and document metrics into a single cohesive hook.
 */
import { useMemo } from 'react';
import type { Tab } from '../types';
import type { ViewMode } from '../types';
import type { ThemeName } from '../lib/theme';
import { useEditorCore } from './useEditorCore';
import { usePluginRuntime } from './usePluginRuntime';
import { usePluginPanels } from './usePluginPanels';
import { usePreviewRenderers } from './usePreviewRenderers';
import { useDocMetrics } from './useDocMetrics';

export interface UseEditorSessionParams {
  activeTabId: string;
  activeTab: Tab;
  viewMode: ViewMode;
  milkdownPreview: boolean;
  theme: ThemeName;
  vimMode: boolean;
  spellCheck: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  isTauri: boolean;
  rawHandleSaveFile: (tabId?: string) => Promise<void>;
  updateActiveDoc: (content: string) => void;
  getActiveTab: () => Tab;
  /** From useTabs */
  openFileInTab: (path: string) => Promise<void>;
  createNewTab: (content?: string) => void;
  tabsRef: React.MutableRefObject<Tab[]>;
}

export function useEditorSession({
  activeTabId, activeTab, viewMode, milkdownPreview, theme, vimMode,
  spellCheck, autoSave, autoSaveDelay, isTauri,
  rawHandleSaveFile, updateActiveDoc, getActiveTab,
  openFileInTab, createNewTab, tabsRef,
}: UseEditorSessionParams) {
  // ── Preview renderers ────────────────────────────────────────────
  const { renderers: pluginRenderers, registerPreviewRenderer, unregisterPreviewRenderer } = usePreviewRenderers();

  // ── Plugin panels ────────────────────────────────────────────────
  const { panels: pluginPanels, registerPanel: registerPluginPanel, unregisterPanel: unregisterPluginPanel } = usePluginPanels();

  // ── Editor core ──────────────────────────────────────────────────
  const editorCoreResult = useEditorCore({
    activeTabId, activeTab, viewMode, milkdownPreview, theme, vimMode,
    spellCheck, autoSave, autoSaveDelay, isTauri,
    rawHandleSaveFile, updateActiveDoc, getActiveTab,
  });

  // ── Doc metrics ──────────────────────────────────────────────────
  const { debouncedDoc, tocEntries, wordCount } = useDocMetrics(activeTab.doc, activeTabId);

  // ── Plugin runtime ───────────────────────────────────────────────
  const pluginRuntimeDeps = useMemo(() => ({
    getActiveTab: () => {
      const t = getActiveTab();
      return { path: t.filePath, content: t.doc };
    },
    openFileInTab: (path: string) => void openFileInTab(path),
    openNewUntitled: (content: string) => createNewTab(content),
    getOpenFilePaths: () => tabsRef.current.filter(t => t.filePath).map(t => t.filePath!),
    cmViewRef: editorCoreResult.cmViewRef,
    registerSidebarPanel: registerPluginPanel,
    unregisterSidebarPanel: unregisterPluginPanel,
    addStatusBarItem: () => {},
    removeStatusBarItem: () => {},
    registerPreviewRenderer,
    unregisterPreviewRenderer,
  }), [getActiveTab, openFileInTab, createNewTab, editorCoreResult.cmViewRef, registerPluginPanel, unregisterPluginPanel, registerPreviewRenderer, unregisterPreviewRenderer]);

  const { activatePlugin, deactivatePlugin } = usePluginRuntime(pluginRuntimeDeps);

  return {
    ...editorCoreResult,
    pluginRenderers, registerPreviewRenderer, unregisterPreviewRenderer,
    pluginPanels, registerPluginPanel, unregisterPluginPanel,
    debouncedDoc, tocEntries, wordCount,
    activatePlugin, deactivatePlugin,
  };
}
