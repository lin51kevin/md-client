import { describe, it, expect, vi } from 'vitest';
import { createEditorAPI } from '../../plugins/plugin-editor';

describe('createEditorAPI - getActiveFilePath', () => {
  it('returns the active file path from getActiveTab dep', () => {
    const getActiveTab = vi.fn(() => ({ path: '/workspace/note.md', content: '# Hello' }));
    const api = createEditorAPI({ cmViewRef: { current: null }, getActiveTab });
    expect(api.getActiveFilePath()).toBe('/workspace/note.md');
  });

  it('returns null when getActiveTab returns null', () => {
    const getActiveTab = vi.fn(() => null);
    const api = createEditorAPI({ cmViewRef: { current: null }, getActiveTab });
    expect(api.getActiveFilePath()).toBeNull();
  });

  it('returns null when active tab has a null path', () => {
    const getActiveTab = vi.fn(() => ({ path: null, content: '' }));
    const api = createEditorAPI({ cmViewRef: { current: null }, getActiveTab });
    expect(api.getActiveFilePath()).toBeNull();
  });

  it('returns null when getActiveTab dep is not provided', () => {
    const api = createEditorAPI({ cmViewRef: { current: null } });
    expect(api.getActiveFilePath()).toBeNull();
  });
});
