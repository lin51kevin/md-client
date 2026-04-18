/**
 * editor-store tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../../stores/editor-store';

beforeEach(() => {
  // Reset store to defaults between tests
  useEditorStore.setState({
    viewMode: 'split',
    splitSizes: [50, 50],
    isRestoringSession: true,
  });
});

describe('useEditorStore', () => {
  it('has correct default values', () => {
    const state = useEditorStore.getState();
    expect(state.viewMode).toBe('split');
    expect(state.splitSizes).toEqual([50, 50]);
    expect(state.isRestoringSession).toBe(true);
  });

  it('setViewMode updates viewMode', () => {
    useEditorStore.getState().setViewMode('edit');
    expect(useEditorStore.getState().viewMode).toBe('edit');
  });

  it('setViewMode persists to localStorage', () => {
    useEditorStore.getState().setViewMode('preview');
    expect(localStorage.getItem('marklite-view-mode')).toBe('preview');
  });

  it('setSplitSizes updates splitSizes', () => {
    useEditorStore.getState().setSplitSizes([30, 70]);
    expect(useEditorStore.getState().splitSizes).toEqual([30, 70]);
  });

  it('setIsRestoringSession updates flag', () => {
    useEditorStore.getState().setIsRestoringSession(false);
    expect(useEditorStore.getState().isRestoringSession).toBe(false);
  });
});
