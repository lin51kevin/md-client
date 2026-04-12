import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Mock modules before importing hook
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../../lib/image-paste', () => ({
  getImageSaveDir: vi.fn(() => ''),
  generateImageFileName: vi.fn((ext: string) => `img-1700000000000.${ext}`),
  buildImageMarkdownPath: vi.fn((_dir: string, file: string) => file),
}));

describe('useImagePaste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('can be imported as a module', async () => {
    const mod = await import('../../hooks/useImagePaste');
    expect(mod.useImagePaste).toBeDefined();
  });

  it('returns saveAndInsert helper function', async () => {
    const { useImagePaste } = await import('../../hooks/useImagePaste');
    const insertText = vi.fn();
    const { result } = renderHook(() =>
      useImagePaste({ insertText, enabled: true })
    );
    expect(result.current).toBeDefined();
    expect(typeof result.current.saveAndInsert).toBe('function');
  });

  it('does not throw when enabled is false', async () => {
    const { useImagePaste } = await import('../../hooks/useImagePaste');
    const insertText = vi.fn();
    expect(() =>
      renderHook(() => useImagePaste({ insertText, enabled: false }))
    ).not.toThrow();
  });

  it('does not throw when docPath is null', async () => {
    const { useImagePaste } = await import('../../hooks/useImagePaste');
    const insertText = vi.fn();
    expect(() =>
      renderHook(() =>
        useImagePaste({ insertText, enabled: true, docPath: null })
      )
    ).not.toThrow();
  });

  it('does not call insertText unless a paste event fires', async () => {
    const { useImagePaste } = await import('../../hooks/useImagePaste');
    const insertText = vi.fn();
    renderHook(() => useImagePaste({ insertText, enabled: true }));
    // No paste event fired
    expect(insertText).not.toHaveBeenCalled();
  });
});

