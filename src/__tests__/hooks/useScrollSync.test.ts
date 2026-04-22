import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollSync } from '../../hooks/useScrollSync';
import React from 'react';

describe('useScrollSync', () => {
  it('返回 editorRef, previewRef, 和滚动处理函数', () => {
    const { result } = renderHook(() => useScrollSync('split'));
    expect(result.current.editorRef).toBeDefined();
    expect(result.current.previewRef).toBeDefined();
    expect(typeof result.current.handleEditorScroll).toBe('function');
    expect(typeof result.current.handlePreviewScroll).toBe('function');
  });

  it('非 split 模式不会同步滚动', () => {
    const { result } = renderHook(() => useScrollSync('edit'));
    const mockEvent = { currentTarget: { scrollTop: 100, scrollHeight: 500, clientHeight: 200 } } as unknown as React.UIEvent<HTMLDivElement>;
    expect(() => result.current.handleEditorScroll(mockEvent)).not.toThrow();
    expect(() => result.current.handlePreviewScroll(mockEvent)).not.toThrow();
  });

  it('初始 ref 值为 null', () => {
    const { result } = renderHook(() => useScrollSync('split'));
    expect(result.current.editorRef.current).toBeNull();
    expect(result.current.previewRef.current).toBeNull();
  });

  it('split 模式下 handleEditorScroll 按比例同步预览滚动', () => {
    const { result } = renderHook(() => useScrollSync('split'));

    const editorEl = document.createElement('div');
    const previewEl = document.createElement('div');
    document.body.appendChild(editorEl);
    document.body.appendChild(previewEl);

    Object.defineProperty(previewEl, 'scrollHeight', { value: 800, configurable: true });
    Object.defineProperty(previewEl, 'clientHeight', { value: 200, configurable: true });
    // Handler reads editorRef.current directly (ignores event), so set scroll props on the element
    Object.defineProperty(editorEl, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(editorEl, 'clientHeight', { value: 200, configurable: true });
    Object.defineProperty(editorEl, 'scrollTop', { value: 150, writable: true, configurable: true });

    (result.current.editorRef as React.MutableRefObject<HTMLDivElement>).current = editorEl;
    (result.current.previewRef as React.MutableRefObject<HTMLDivElement>).current = previewEl;

    // pct = 150 / (500 - 200) = 0.5 → previewEl.scrollTop = 0.5 * (800 - 200) = 300
    const event = {
      currentTarget: editorEl,
    } as unknown as React.UIEvent<HTMLDivElement>;
    result.current.handleEditorScroll(event);

    expect(previewEl.scrollTop).toBe(300);

    document.body.removeChild(editorEl);
    document.body.removeChild(previewEl);
  });

  it('split 模式下 handlePreviewScroll 按比例同步编辑器滚动', () => {
    const { result } = renderHook(() => useScrollSync('split'));

    const editorEl = document.createElement('div');
    const previewEl = document.createElement('div');
    document.body.appendChild(editorEl);
    document.body.appendChild(previewEl);

    Object.defineProperty(editorEl, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(editorEl, 'clientHeight', { value: 400, configurable: true });
    // Handler reads previewRef.current directly (ignores event), so set scroll props on the element
    Object.defineProperty(previewEl, 'scrollHeight', { value: 300, configurable: true });
    Object.defineProperty(previewEl, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(previewEl, 'scrollTop', { value: 60, writable: true, configurable: true });

    (result.current.editorRef as React.MutableRefObject<HTMLDivElement>).current = editorEl;
    (result.current.previewRef as React.MutableRefObject<HTMLDivElement>).current = previewEl;

    // pct = 60 / (300 - 100) = 0.3 → editorEl.scrollTop = 0.3 * (1000 - 400) = 180
    const event = {
      currentTarget: previewEl,
    } as unknown as React.UIEvent<HTMLDivElement>;
    result.current.handlePreviewScroll(event);

    expect(editorEl.scrollTop).toBe(180);

    document.body.removeChild(editorEl);
    document.body.removeChild(previewEl);
  });

  it('ref 为 null 时 split 模式下不报错', () => {
    const { result } = renderHook(() => useScrollSync('split'));
    const event = {
      currentTarget: { scrollTop: 100, scrollHeight: 500, clientHeight: 200 },
    } as unknown as React.UIEvent<HTMLDivElement>;
    // Both refs remain null
    expect(() => result.current.handleEditorScroll(event)).not.toThrow();
    expect(() => result.current.handlePreviewScroll(event)).not.toThrow();
  });
});
