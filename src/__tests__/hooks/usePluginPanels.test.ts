import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePluginPanels } from '../../hooks/usePluginPanels';

describe('usePluginPanels', () => {
  it('starts with empty panels', () => {
    const { result } = renderHook(() => usePluginPanels());
    expect(result.current.panels).toEqual([]);
  });

  it('registers a panel', () => {
    const { result } = renderHook(() => usePluginPanels());

    act(() => {
      result.current.registerPanel('test-panel', { type: 'content' }, { title: 'Test', icon: '🔗' });
    });

    expect(result.current.panels).toHaveLength(1);
    expect(result.current.panels[0]).toEqual({
      id: 'test-panel',
      title: 'Test',
      icon: '🔗',
      content: { type: 'content' },
    });
  });

  it('uses id as title when no meta provided', () => {
    const { result } = renderHook(() => usePluginPanels());

    act(() => {
      result.current.registerPanel('my-panel', null);
    });

    expect(result.current.panels[0].title).toBe('my-panel');
  });

  it('replaces panel with same id', () => {
    const { result } = renderHook(() => usePluginPanels());

    act(() => {
      result.current.registerPanel('p1', 'old', { title: 'Old' });
    });
    act(() => {
      result.current.registerPanel('p1', 'new', { title: 'New' });
    });

    expect(result.current.panels).toHaveLength(1);
    expect(result.current.panels[0].title).toBe('New');
    expect(result.current.panels[0].content).toBe('new');
  });

  it('unregisters a panel', () => {
    const { result } = renderHook(() => usePluginPanels());

    act(() => {
      result.current.registerPanel('p1', 'c1', { title: 'One' });
      result.current.registerPanel('p2', 'c2', { title: 'Two' });
    });
    act(() => {
      result.current.unregisterPanel('p1');
    });

    expect(result.current.panels).toHaveLength(1);
    expect(result.current.panels[0].id).toBe('p2');
  });

  it('unregister is safe for unknown id', () => {
    const { result } = renderHook(() => usePluginPanels());

    act(() => {
      result.current.unregisterPanel('nonexistent');
    });

    expect(result.current.panels).toEqual([]);
  });

  it('registers multiple panels', () => {
    const { result } = renderHook(() => usePluginPanels());

    act(() => {
      result.current.registerPanel('a', 'ca', { title: 'A' });
      result.current.registerPanel('b', 'cb', { title: 'B' });
      result.current.registerPanel('c', 'cc', { title: 'C' });
    });

    expect(result.current.panels).toHaveLength(3);
    expect(result.current.panels.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
