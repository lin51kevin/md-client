import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock ActivityBar so this test doesn't pull in the full component tree
vi.mock('../../components/ActivityBar', () => ({
  PANEL_ITEMS: [
    { id: 'filetree' },
    { id: 'toc' },
    { id: 'search' },
    { id: 'plugins' },
    { id: 'git' },
  ],
}));

const { useSidebarPanel } = await import('../../hooks/useSidebarPanel');

describe('useSidebarPanel', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to null activePanel when nothing stored', () => {
    const { result } = renderHook(() => useSidebarPanel());
    expect(result.current.activePanel).toBeNull();
  });

  it('all show* flags are false by default', () => {
    const { result } = renderHook(() => useSidebarPanel());
    expect(result.current.showFileTree).toBe(false);
    expect(result.current.showToc).toBe(false);
    expect(result.current.showSearchPanel).toBe(false);
    expect(result.current.showGitPanel).toBe(false);
    expect(result.current.showPluginsPanel).toBe(false);
  });

  it('setActivePanel to "filetree" sets activePanel and showFileTree=true', () => {
    const { result } = renderHook(() => useSidebarPanel());
    act(() => { result.current.setActivePanel('filetree'); });
    expect(result.current.activePanel).toBe('filetree');
    expect(result.current.showFileTree).toBe(true);
    expect(result.current.showToc).toBe(false);
  });

  it('setActivePanel to "toc" sets showToc=true', () => {
    const { result } = renderHook(() => useSidebarPanel());
    act(() => { result.current.setActivePanel('toc'); });
    expect(result.current.showToc).toBe(true);
    expect(result.current.showFileTree).toBe(false);
  });

  it('setActivePanel to "search" sets showSearchPanel=true', () => {
    const { result } = renderHook(() => useSidebarPanel());
    act(() => { result.current.setActivePanel('search'); });
    expect(result.current.showSearchPanel).toBe(true);
  });

  it('setActivePanel to "git" sets showGitPanel=true', () => {
    const { result } = renderHook(() => useSidebarPanel());
    act(() => { result.current.setActivePanel('git'); });
    expect(result.current.showGitPanel).toBe(true);
  });

  it('setActivePanel to "plugins" sets showPluginsPanel=true', () => {
    const { result } = renderHook(() => useSidebarPanel());
    act(() => { result.current.setActivePanel('plugins'); });
    expect(result.current.showPluginsPanel).toBe(true);
  });

  it('setActivePanel to null resets activePanel to null', () => {
    const { result } = renderHook(() => useSidebarPanel());
    act(() => { result.current.setActivePanel('filetree'); });
    act(() => { result.current.setActivePanel(null); });
    expect(result.current.activePanel).toBeNull();
    expect(result.current.showFileTree).toBe(false);
  });

  it('allows dynamic (plugin) panel IDs not in PANEL_ITEMS', () => {
    const { result } = renderHook(() => useSidebarPanel());
    act(() => { result.current.setActivePanel('my-plugin-panel'); });
    expect(result.current.activePanel).toBe('my-plugin-panel');
    // None of the built-in flags should activate
    expect(result.current.showFileTree).toBe(false);
    expect(result.current.showToc).toBe(false);
    expect(result.current.showSearchPanel).toBe(false);
  });

  it('reads persisted panel from localStorage on mount', () => {
    localStorage.setItem('marklite-active-panel', 'toc');
    const { result } = renderHook(() => useSidebarPanel());
    expect(result.current.activePanel).toBe('toc');
    expect(result.current.showToc).toBe(true);
  });

  it('persists panel selection to localStorage', () => {
    const { result } = renderHook(() => useSidebarPanel());
    act(() => { result.current.setActivePanel('git'); });
    expect(localStorage.getItem('marklite-active-panel')).toBe('git');
  });

  it('persists null as empty string to localStorage', () => {
    const { result } = renderHook(() => useSidebarPanel());
    act(() => { result.current.setActivePanel('git'); });
    act(() => { result.current.setActivePanel(null); });
    expect(localStorage.getItem('marklite-active-panel')).toBe('');
  });
});
