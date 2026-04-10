import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock modules before importing hook
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../../lib/image-paste', () => ({
  getImageSaveDir: vi.fn(() => ''),
  generateImageFileName: vi.fn((ext) => `img-1700000000000.${ext}`),
  buildImageMarkdownPath: vi.fn((_dir, file) => file),
}));

// We test the pure utility functions separately in image-paste.test.ts
// This file tests the hook's integration logic only

describe('useImagePaste — pure integration checks', () => {
  it('should be importable as a module', async () => {
    const mod = await import('../../hooks/useImagePaste');
    expect(mod.useImagePaste).toBeDefined();
  });
});
