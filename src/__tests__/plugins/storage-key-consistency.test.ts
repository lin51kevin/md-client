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

  test('plugin-storage uses marklite-installed-plugins key', () => {
    const pluginStorage = new PluginStorage();
    pluginStorage.getInstalledPlugins();
    expect(storage.getItem).toHaveBeenCalledWith('marklite-installed-plugins');
  });

  test('usePlugins hook uses same storage key as plugin-storage', () => {
    // When usePlugins loads plugins, it should use the same storage key
    renderHook(() => usePlugins());
    // usePlugins should call localStorage with 'marklite-installed-plugins'
    // not 'marklite-ui-plugins'
    expect(storage.getItem).toHaveBeenCalledWith('marklite-installed-plugins');
  });

  test('migration path for existing marklite-ui-plugins data', () => {
    // Simulate old data structure
    const oldData = [{ id: 'test-plugin', enabled: true }];
    (storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(oldData));
    
    renderHook(() => usePlugins());
    // Should have read from the correct key
    expect(storage.getItem).toHaveBeenCalledWith('marklite-installed-plugins');
    // Should have saved migrated data (original + missing defaults merged in)
    expect(storage.setItem).toHaveBeenCalledWith(
      'marklite-installed-plugins',
      expect.stringContaining('test-plugin'),
    );
  });
});