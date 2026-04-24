import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppToolbar, type UseAppToolbarParams } from '../../hooks/useAppToolbar';
import { useUIStore } from '../../stores';

// milkdown bridge is a module-level singleton — mock it
vi.mock('../../lib/milkdown/editor-bridge', () => ({
  milkdownBridge: { undo: vi.fn(), redo: vi.fn() },
}));
// restoreSnapshot
vi.mock('../../lib/storage/version-history', () => ({
  restoreSnapshot: vi.fn(),
}));

const { milkdownBridge } = await import('../../lib/milkdown/editor-bridge');
const { restoreSnapshot } = await import('../../lib/storage/version-history');

function makeParams(overrides: Partial<UseAppToolbarParams> = {}): UseAppToolbarParams {
  return {
    handleSaveWithWatchMark: vi.fn(),
    handleSaveAsFile: vi.fn(),
    handleExportPng: vi.fn().mockResolvedValue(undefined),
    previewRef: { current: null },
    spellCheck: false,
    setSpellCheck: vi.fn(),
    vimMode: false,
    setVimMode: vi.fn(),
    showAIPanel: false,
    setShowAIPanel: vi.fn(),
    milkdownPreview: false,
    cmViewRef: { current: null },
    renameTab: vi.fn().mockResolvedValue(true),
    setRenamingTabId: vi.fn(),
    pinTab: vi.fn(),
    unpinTab: vi.fn(),
    setCtxMenu: vi.fn(),
    activeTabFilePath: null,
    updateActiveDoc: vi.fn(),
    ...overrides,
  };
}

describe('useAppToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showUpdateNotification: false });
  });

  // ── stableOnSaveFile ──────────────────────────────────────────────

  it('stableOnSaveFile calls handleSaveWithWatchMark', () => {
    const params = makeParams();
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnSaveFile(); });
    expect(params.handleSaveWithWatchMark).toHaveBeenCalledOnce();
  });

  // ── stableOnSaveAsFile ────────────────────────────────────────────

  it('stableOnSaveAsFile calls handleSaveAsFile', () => {
    const params = makeParams();
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnSaveAsFile(); });
    expect(params.handleSaveAsFile).toHaveBeenCalledOnce();
  });

  // ── stableOnExportPng ─────────────────────────────────────────────

  it('stableOnExportPng calls handleExportPng with previewRef.current', () => {
    const fakeEl = document.createElement('div');
    const params = makeParams({ previewRef: { current: fakeEl } });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnExportPng(); });
    expect(params.handleExportPng).toHaveBeenCalledWith(fakeEl);
  });

  // ── stableOnToggleSpellCheck ──────────────────────────────────────

  it('stableOnToggleSpellCheck toggles spellCheck off→on', () => {
    const params = makeParams({ spellCheck: false });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnToggleSpellCheck(); });
    expect(params.setSpellCheck).toHaveBeenCalledWith(true);
  });

  it('stableOnToggleSpellCheck toggles spellCheck on→off', () => {
    const params = makeParams({ spellCheck: true });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnToggleSpellCheck(); });
    expect(params.setSpellCheck).toHaveBeenCalledWith(false);
  });

  // ── stableOnToggleVimMode ─────────────────────────────────────────

  it('stableOnToggleVimMode toggles vimMode', () => {
    const params = makeParams({ vimMode: false });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnToggleVimMode(); });
    expect(params.setVimMode).toHaveBeenCalledWith(true);
  });

  // ── stableOnToggleAIPanel ─────────────────────────────────────────

  it('stableOnToggleAIPanel toggles showAIPanel', () => {
    const params = makeParams({ showAIPanel: false });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnToggleAIPanel(); });
    expect(params.setShowAIPanel).toHaveBeenCalledWith(true);
  });

  // ── stableOnUndo / stableOnRedo ───────────────────────────────────

  it('stableOnUndo calls milkdownBridge.undo when milkdownPreview=true', () => {
    const params = makeParams({ milkdownPreview: true });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnUndo(); });
    expect(milkdownBridge.undo).toHaveBeenCalledOnce();
  });

  it('stableOnRedo calls milkdownBridge.redo when milkdownPreview=true', () => {
    const params = makeParams({ milkdownPreview: true });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnRedo(); });
    expect(milkdownBridge.redo).toHaveBeenCalledOnce();
  });

  it('stableOnUndo calls undo(view) when milkdownPreview=false', () => {
    // cmViewRef.current is null here — undo() is not called but no error thrown
    const params = makeParams({ milkdownPreview: false });
    const { result } = renderHook(() => useAppToolbar(params));
    expect(() => act(() => { result.current.stableOnUndo(); })).not.toThrow();
    expect(milkdownBridge.undo).not.toHaveBeenCalled();
  });

  // ── stableOnConfirmRename ─────────────────────────────────────────

  it('stableOnConfirmRename calls renameTab and clears renamingTabId on success', async () => {
    const params = makeParams({ renameTab: vi.fn().mockResolvedValue(true) });
    const { result } = renderHook(() => useAppToolbar(params));
    await act(async () => { await result.current.stableOnConfirmRename('tab-1', 'New Name'); });
    expect(params.renameTab).toHaveBeenCalledWith('tab-1', 'New Name');
    expect(params.setRenamingTabId).toHaveBeenCalledWith(null);
  });

  it('stableOnConfirmRename does NOT clear renamingTabId if rename fails', async () => {
    const params = makeParams({ renameTab: vi.fn().mockResolvedValue(false) });
    const { result } = renderHook(() => useAppToolbar(params));
    await act(async () => { await result.current.stableOnConfirmRename('tab-1', 'bad'); });
    expect(params.setRenamingTabId).not.toHaveBeenCalled();
  });

  // ── stableOnCancelRename ──────────────────────────────────────────

  it('stableOnCancelRename calls setRenamingTabId(null)', () => {
    const params = makeParams();
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnCancelRename(); });
    expect(params.setRenamingTabId).toHaveBeenCalledWith(null);
  });

  // ── stableOnPin / stableOnUnpin ───────────────────────────────────

  it('stableOnPin pins tab and clears ctxMenu', () => {
    const params = makeParams();
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnPin('tab-1'); });
    expect(params.pinTab).toHaveBeenCalledWith('tab-1');
    expect(params.setCtxMenu).toHaveBeenCalledWith(null);
  });

  it('stableOnUnpin unpins tab and clears ctxMenu', () => {
    const params = makeParams();
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnUnpin('tab-2'); });
    expect(params.unpinTab).toHaveBeenCalledWith('tab-2');
    expect(params.setCtxMenu).toHaveBeenCalledWith(null);
  });

  // ── stableOnUpdateClick ───────────────────────────────────────────

  it('stableOnUpdateClick toggles showUpdateNotification in UIStore', () => {
    useUIStore.setState({ showUpdateNotification: false });
    const params = makeParams();
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnUpdateClick(); });
    expect(useUIStore.getState().showUpdateNotification).toBe(true);
    act(() => { result.current.stableOnUpdateClick(); });
    expect(useUIStore.getState().showUpdateNotification).toBe(false);
  });

  // ── stableOnSnapshotRestore ───────────────────────────────────────

  it('stableOnSnapshotRestore does nothing when activeTabFilePath is null', () => {
    const params = makeParams({ activeTabFilePath: null });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnSnapshotRestore('snap-1'); });
    expect(restoreSnapshot).not.toHaveBeenCalled();
    expect(params.updateActiveDoc).not.toHaveBeenCalled();
  });

  it('stableOnSnapshotRestore calls restoreSnapshot and updateActiveDoc on success', () => {
    vi.mocked(restoreSnapshot).mockReturnValue('restored content');
    const params = makeParams({ activeTabFilePath: '/notes/file.md' });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnSnapshotRestore('snap-1'); });
    expect(restoreSnapshot).toHaveBeenCalledWith('/notes/file.md', 'snap-1');
    expect(params.updateActiveDoc).toHaveBeenCalledWith('restored content');
  });

  it('stableOnSnapshotRestore does NOT call updateActiveDoc when restoreSnapshot returns null', () => {
    vi.mocked(restoreSnapshot).mockReturnValue(null);
    const params = makeParams({ activeTabFilePath: '/notes/file.md' });
    const { result } = renderHook(() => useAppToolbar(params));
    act(() => { result.current.stableOnSnapshotRestore('snap-1'); });
    expect(params.updateActiveDoc).not.toHaveBeenCalled();
  });

  // ── callback stability (useCallback identity) ────────────────────

  it('stableOnSaveFile reference is stable across re-renders without dep changes', () => {
    const params = makeParams();
    const { result, rerender } = renderHook(() => useAppToolbar(params));
    const ref1 = result.current.stableOnSaveFile;
    rerender();
    expect(result.current.stableOnSaveFile).toBe(ref1);
  });
});
