import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorStore, useUIStore } from '../../stores';

vi.mock('../../components/ActivityBar', () => ({
  PANEL_ITEMS: [
    { id: 'filetree' },
    { id: 'toc' },
    { id: 'search' },
    { id: 'plugins' },
  ],
}));

const { useAppLayout } = await import('../../hooks/useAppLayout');

describe('useAppLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    useEditorStore.setState({ viewMode: 'split', splitSizes: [50, 50] });
    useUIStore.setState({ activePanel: null });
  });

  // ── viewMode ─────────────────────────────────────────────────────

  it('defaults viewMode to "split"', () => {
    const { result } = renderHook(() => useAppLayout());
    expect(result.current.viewMode).toBe('split');
  });

  it('setViewMode updates viewMode', () => {
    const { result } = renderHook(() => useAppLayout());
    act(() => { result.current.setViewMode('preview'); });
    expect(result.current.viewMode).toBe('preview');
  });

  it('setViewMode to "edit" is reflected in EditorStore', () => {
    const { result } = renderHook(() => useAppLayout());
    act(() => { result.current.setViewMode('edit'); });
    expect(useEditorStore.getState().viewMode).toBe('edit');
  });

  // ── splitSizes ───────────────────────────────────────────────────

  it('defaults splitSizes to [50, 50]', () => {
    const { result } = renderHook(() => useAppLayout());
    expect(result.current.splitSizes).toEqual([50, 50]);
  });

  it('setSplitSizes updates splitSizes', () => {
    const { result } = renderHook(() => useAppLayout());
    act(() => { result.current.setSplitSizes([30, 70]); });
    expect(result.current.splitSizes).toEqual([30, 70]);
  });

  // ── fileTreeRoot ─────────────────────────────────────────────────

  it('defaults fileTreeRoot to empty string', () => {
    const { result } = renderHook(() => useAppLayout());
    expect(result.current.fileTreeRoot).toBe('');
  });

  it('loads fileTreeRoot from localStorage', () => {
    localStorage.setItem('marklite-filetree-root', '/home/user/notes');
    const { result } = renderHook(() => useAppLayout());
    expect(result.current.fileTreeRoot).toBe('/home/user/notes');
  });

  it('setFileTreeRoot updates state', () => {
    const { result } = renderHook(() => useAppLayout());
    act(() => { result.current.setFileTreeRoot('/projects/docs'); });
    expect(result.current.fileTreeRoot).toBe('/projects/docs');
  });

  // ── sidebar panel (delegated to useSidebarPanel) ─────────────────

  it('exposes activePanel, setActivePanel, togglePanel from useSidebarPanel', () => {
    const { result } = renderHook(() => useAppLayout());
    expect(result.current.activePanel).toBeNull();
    act(() => { result.current.setActivePanel('filetree'); });
    expect(result.current.activePanel).toBe('filetree');
    expect(result.current.showFileTree).toBe(true);
  });

  it('togglePanel opens a closed panel', () => {
    const { result } = renderHook(() => useAppLayout());
    act(() => { result.current.togglePanel('toc'); });
    expect(result.current.showToc).toBe(true);
  });

  it('togglePanel closes an open panel', () => {
    useUIStore.setState({ activePanel: 'toc' });
    const { result } = renderHook(() => useAppLayout());
    act(() => { result.current.togglePanel('toc'); });
    expect(result.current.showToc).toBe(false);
    expect(result.current.activePanel).toBeNull();
  });

  it('all showX flags are false by default', () => {
    const { result } = renderHook(() => useAppLayout());
    expect(result.current.showFileTree).toBe(false);
    expect(result.current.showToc).toBe(false);
    expect(result.current.showSearchPanel).toBe(false);
    expect(result.current.showPluginsPanel).toBe(false);
  });
});
