import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormatActions } from '../../hooks/useFormatActions';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

describe('useFormatActions', () => {
  const mockCmView = {
    current: null,
  };

  const mockGetActiveTab = vi.fn(() => ({
    id: '1',
    filePath: '/test.md',
    doc: '# Test',
    isDirty: false,
  }));

  const mockPromptUser = vi.fn();

  it('返回 handleFormatAction 函数', () => {
    const { result } = renderHook(() =>
      useFormatActions({
        cmViewRef: mockCmView as any,
        getActiveTab: mockGetActiveTab as any,
        promptUser: mockPromptUser,
      })
    );
    expect(typeof result.current.handleFormatAction).toBe('function');
  });

  it('cmView 为 null 时不报错', () => {
    const { result } = renderHook(() =>
      useFormatActions({
        cmViewRef: { current: null },
        getActiveTab: mockGetActiveTab as any,
        promptUser: mockPromptUser,
      })
    );
    expect(() => result.current.handleFormatAction('bold')).not.toThrow();
  });

  it('actions 包含所有格式化类型', () => {
    const { result } = renderHook(() =>
      useFormatActions({
        cmViewRef: { current: null },
        getActiveTab: mockGetActiveTab as any,
        promptUser: mockPromptUser,
      })
    );
    const action = result.current.handleFormatAction;
    // Should not throw for any action type
    expect(() => action('bold')).not.toThrow();
    expect(() => action('italic')).not.toThrow();
    expect(() => action('heading')).not.toThrow();
    expect(() => action('link')).not.toThrow();
    expect(() => action('image')).not.toThrow();
  });
});
