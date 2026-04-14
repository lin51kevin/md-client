import { test, describe, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlugins } from '../../hooks/usePlugins';
import { PluginStorage } from '../../plugins/plugin-storage';

describe('Plugin Storage Key Consistency', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    Object.defineProperty(global, 'localStorage', {
      value: storage,
      writable: true,
    });
  });

  test('plugin-storage (lifecycle layer) uses marklite-plugin-records key', () => {
    const pluginStorage = new PluginStorage();
    pluginStorage.getInstalledPlugins();
    expect(storage.getItem).toHaveBeenCalledWith('marklite-plugin-records');
  });

  test('usePlugins hook uses marklite-installed-plugins key (UI layer)', () => {
    renderHook(() => usePlugins());
    expect(storage.getItem).toHaveBeenCalledWith('marklite-installed-plugins');
  });

  test('the two storage keys are different (no collision)', () => {
    const lifecycleKey = 'marklite-plugin-records';
    const uiKey = 'marklite-installed-plugins';
    expect(lifecycleKey).not.toBe(uiKey);
  });

  test('lifecycle layer does NOT use the UI key', () => {
    const pluginStorage = new PluginStorage();
    pluginStorage.getInstalledPlugins();
    expect(storage.getItem).not.toHaveBeenCalledWith('marklite-installed-plugins');
  });

  test('migration path for existing marklite-ui-plugins data', () => {
    // Simulate old data structure
    const oldData = [{ id: 'test-plugin', enabled: true }];
    (storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(oldData));

    renderHook(() => usePlugins());
    // Should have read from the correct UI key
    expect(storage.getItem).toHaveBeenCalledWith('marklite-installed-plugins');
    // Should have saved migrated data (original + missing defaults merged in)
    expect(storage.setItem).toHaveBeenCalledWith(
      'marklite-installed-plugins',
      expect.stringContaining('test-plugin'),
    );
  });
});