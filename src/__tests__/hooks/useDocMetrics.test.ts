import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocMetrics } from '../../hooks/useDocMetrics';

describe('useDocMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial doc immediately as debouncedDoc', () => {
    const { result } = renderHook(() => useDocMetrics('# Hello', 'tab-1'));
    expect(result.current.debouncedDoc).toBe('# Hello');
  });

  it('does not update debouncedDoc before 300ms', () => {
    const { result, rerender } = renderHook(
      ({ doc, tabId }: { doc: string; tabId: string }) => useDocMetrics(doc, tabId),
      { initialProps: { doc: '# Hello', tabId: 'tab-1' } },
    );

    rerender({ doc: '# World', tabId: 'tab-1' });
    act(() => { vi.advanceTimersByTime(299); });

    expect(result.current.debouncedDoc).toBe('# Hello');
  });

  it('updates debouncedDoc after 300ms', async () => {
    const { result, rerender } = renderHook(
      ({ doc, tabId }: { doc: string; tabId: string }) => useDocMetrics(doc, tabId),
      { initialProps: { doc: '# Hello', tabId: 'tab-1' } },
    );

    rerender({ doc: '# World', tabId: 'tab-1' });
    await act(async () => { vi.advanceTimersByTime(300); });

    expect(result.current.debouncedDoc).toBe('# World');
  });

  it('restarts debounce timer on tab switch', async () => {
    const { result, rerender } = renderHook(
      ({ doc, tabId }: { doc: string; tabId: string }) => useDocMetrics(doc, tabId),
      { initialProps: { doc: '# Tab1', tabId: 'tab-1' } },
    );

    // Switch to a new tab with different doc
    rerender({ doc: '# Tab2', tabId: 'tab-2' });
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current.debouncedDoc).toBe('# Tab1'); // still old

    await act(async () => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedDoc).toBe('# Tab2');
  });

  it('computes tocEntries from debouncedDoc', async () => {
    const { result, rerender } = renderHook(
      ({ doc, tabId }: { doc: string; tabId: string }) => useDocMetrics(doc, tabId),
      { initialProps: { doc: '# Title\n## Section', tabId: 'tab-1' } },
    );

    await act(async () => { vi.advanceTimersByTime(300); });

    expect(result.current.tocEntries.length).toBeGreaterThan(0);
    expect(result.current.tocEntries[0].text).toBe('Title');
  });

  it('computes wordCount from debouncedDoc', async () => {
    const { result } = renderHook(() => useDocMetrics('hello world', 'tab-1'));

    await act(async () => { vi.advanceTimersByTime(300); });

    expect(result.current.wordCount).toBeGreaterThan(0);
  });
});
