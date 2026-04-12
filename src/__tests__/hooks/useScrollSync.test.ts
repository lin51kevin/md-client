import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollSync } from '../../hooks/useScrollSync';

describe('useScrollSync', () => {
  it('返回 editorRef, previewRef, 和滚动处理函数', () => {
    const { result } = renderHook(() => useScrollSync('split'));
    expect(result.current.editorRef).toBeDefined();
    expect(result.current.previewRef).toBeDefined();
    expect(typeof result.current.handleEditorScroll).toBe('function');
    expect(typeof result.current.handlePreviewScroll).toBe('function');
  });

  it('非 split 模式不会同步滚动', () => {
    const { result } = renderHook(() => useScrollSync('editor'));
    // Calling scroll handlers in non-split mode should not throw
    const mockEvent = { currentTarget: { scrollTop: 100, scrollHeight: 500, clientHeight: 200 } } as unknown as React.UIEvent<HTMLDivElement>;
    expect(() => result.current.handleEditorScroll(mockEvent)).not.toThrow();
    expect(() => result.current.handlePreviewScroll(mockEvent)).not.toThrow();
  });

  it('初始 ref 值为 null', () => {
    const { result } = renderHook(() => useScrollSync('split'));
    expect(result.current.editorRef.current).toBeNull();
    expect(result.current.previewRef.current).toBeNull();
  });
});
