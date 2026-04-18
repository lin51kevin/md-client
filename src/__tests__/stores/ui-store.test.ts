/**
 * ui-store tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../stores/ui-store';

beforeEach(() => {
  useUIStore.setState({
    showSettings: false,
    showAbout: false,
    showCommandPalette: false,
    showQuickOpen: false,
    showAIPanel: false,
    showUpdateNotification: false,
    activePanel: null,
    ctxMenu: null,
    editorCtxMenu: null,
    previewCtxMenu: null,
    isDragOver: false,
    dragKind: 'file',
  });
});

describe('useUIStore', () => {
  it('has correct default values', () => {
    const state = useUIStore.getState();
    expect(state.showSettings).toBe(false);
    expect(state.activePanel).toBeNull();
    expect(state.isDragOver).toBe(false);
    expect(state.ctxMenu).toBeNull();
  });

  it('toggle showSettings', () => {
    useUIStore.getState().setShowSettings(true);
    expect(useUIStore.getState().showSettings).toBe(true);
    useUIStore.getState().setShowSettings(false);
    expect(useUIStore.getState().showSettings).toBe(false);
  });

  it('toggle showAbout', () => {
    useUIStore.getState().setShowAbout(true);
    expect(useUIStore.getState().showAbout).toBe(true);
  });

  it('setActivePanel updates and persists', () => {
    useUIStore.getState().setActivePanel('filetree');
    expect(useUIStore.getState().activePanel).toBe('filetree');
    expect(localStorage.getItem('marklite-active-panel')).toBe('filetree');
  });

  it('setActivePanel(null) clears', () => {
    useUIStore.getState().setActivePanel('toc');
    useUIStore.getState().setActivePanel(null);
    expect(useUIStore.getState().activePanel).toBeNull();
    expect(localStorage.getItem('marklite-active-panel')).toBe('');
  });

  it('togglePanel opens and closes', () => {
    useUIStore.getState().togglePanel('search');
    expect(useUIStore.getState().activePanel).toBe('search');
    useUIStore.getState().togglePanel('search');
    expect(useUIStore.getState().activePanel).toBeNull();
  });

  it('togglePanel switches to different panel', () => {
    useUIStore.getState().togglePanel('search');
    useUIStore.getState().togglePanel('toc');
    expect(useUIStore.getState().activePanel).toBe('toc');
  });

  it('context menu state management', () => {
    const menu = { x: 100, y: 200, tabId: 'abc' };
    useUIStore.getState().setCtxMenu(menu);
    expect(useUIStore.getState().ctxMenu).toEqual(menu);
    useUIStore.getState().setCtxMenu(null);
    expect(useUIStore.getState().ctxMenu).toBeNull();
  });

  it('drag state management', () => {
    useUIStore.getState().setIsDragOver(true);
    useUIStore.getState().setDragKind('folder');
    expect(useUIStore.getState().isDragOver).toBe(true);
    expect(useUIStore.getState().dragKind).toBe('folder');
  });

  it('showAIPanel persists to localStorage', () => {
    useUIStore.getState().setShowAIPanel(true);
    expect(localStorage.getItem('marklite-ai-panel')).toBe('true');
    useUIStore.getState().setShowAIPanel(false);
    expect(localStorage.getItem('marklite-ai-panel')).toBe('false');
  });
});
