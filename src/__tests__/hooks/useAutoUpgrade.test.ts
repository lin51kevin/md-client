import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
});

// Mock Tauri updater plugin
const mockCheck = vi.fn();
const mockUpdate = {
  downloadAndInstall: vi.fn(),
  version: '1.0.0',
  body: 'Release notes here',
  date: '2025-01-01',
};

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: (...args: unknown[]) => mockCheck(...args),
}));

vi.mock('@tauri-apps/plugin-updater/dist-js', () => ({
  check: (...args: unknown[]) => mockCheck(...args),
}));

import { useAutoUpgrade } from '../../hooks/useAutoUpgrade';

describe('useAutoUpgrade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete store['marklite-last-update-check'];
    mockCheck.mockResolvedValue(mockUpdate);
    mockUpdate.downloadAndInstall.mockResolvedValue(undefined);
  });

  it('should check for update when enabled', async () => {
    const onUpdateAvailable = vi.fn();
    const { result } = renderHook(() => useAutoUpgrade({ enabled: true, onUpdateAvailable }));

    await act(async () => {
      await vi.waitFor(() => expect(mockCheck).toHaveBeenCalled());
    });

    expect(onUpdateAvailable).toHaveBeenCalledWith({
      version: '1.0.0',
      releaseNotes: 'Release notes here',
    });
  });

  it('should not check for update when disabled', async () => {
    const onUpdateAvailable = vi.fn();
    renderHook(() => useAutoUpgrade({ enabled: false, onUpdateAvailable }));

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('should skip check if within 24 hours', async () => {
    const twentyThreeHoursAgo = Date.now() - 23 * 60 * 60 * 1000;
    store['marklite-last-update-check'] = String(twentyThreeHoursAgo);

    const onUpdateAvailable = vi.fn();
    renderHook(() => useAutoUpgrade({ enabled: true, onUpdateAvailable }));

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('should check again after 24 hours', async () => {
    const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;
    store['marklite-last-update-check'] = String(twentyFiveHoursAgo);

    const onUpdateAvailable = vi.fn();
    renderHook(() => useAutoUpgrade({ enabled: true, onUpdateAvailable }));

    await act(async () => {
      await vi.waitFor(() => expect(mockCheck).toHaveBeenCalled());
    });

    expect(onUpdateAvailable).toHaveBeenCalled();
  });

  it('should handle no update available', async () => {
    mockCheck.mockResolvedValue(null);
    const onUpdateAvailable = vi.fn();

    renderHook(() => useAutoUpgrade({ enabled: true, onUpdateAvailable }));

    await act(async () => {
      await vi.waitFor(() => expect(mockCheck).toHaveBeenCalled());
    });

    expect(onUpdateAvailable).not.toHaveBeenCalled();
  });

  it('should download and install with progress', async () => {
    const onDownloadProgress = vi.fn();
    const onUpdateReady = vi.fn();

    // Simulate download with progress events
    mockUpdate.downloadAndInstall.mockImplementation(
      (onEvent: (e: { event: string; progress?: { fraction: number } }) => void) => {
        onEvent({ event: 'DownloadStarted', progress: { fraction: 0 } });
        onEvent({ event: 'DownloadProgress', progress: { fraction: 0.5 } });
        onEvent({ event: 'DownloadProgress', progress: { fraction: 1 } });
        return Promise.resolve();
      }
    );

    const { result } = renderHook(() => useAutoUpgrade({
      enabled: false,
      onDownloadProgress,
      onUpdateReady,
    }));

    // Manually set updateInfo so downloadAndInstall has something to work with
    await act(async () => {
      await result.current.checkForUpdate();
    });

    await act(async () => {
      await result.current.downloadAndInstall();
    });

    expect(onDownloadProgress).toHaveBeenCalledWith(0);
    expect(onDownloadProgress).toHaveBeenCalledWith(50);
    expect(onDownloadProgress).toHaveBeenCalledWith(100);
    expect(onUpdateReady).toHaveBeenCalled();
  });

  it('should call onError when check fails', async () => {
    mockCheck.mockRejectedValue(new Error('Network error'));
    const onError = vi.fn();

    renderHook(() => useAutoUpgrade({ enabled: true, onError }));

    await act(async () => {
      await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    });

    expect(onError).toHaveBeenCalledWith('Network error');
  });

  it('should expose checking and downloading states', async () => {
    // Make check hang briefly
    let resolveCheck: () => void;
    mockCheck.mockImplementation(() => new Promise<void>(r => { resolveCheck = r; }).then(() => mockUpdate));

    const { result } = renderHook(() => useAutoUpgrade({ enabled: true }));

    expect(result.current.checking).toBe(true);

    await act(async () => {
      resolveCheck!();
    });

    expect(result.current.checking).toBe(false);
  });
});
