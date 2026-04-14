import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock import.meta.env and window.__TAURI__
vi.mock('../../plugins/registry/quick-install', async () => {
  const actual = await vi.importActual('../../plugins/registry/quick-install');
  return actual;
});

describe('quick-install path candidates', () => {
  beforeEach(() => {
    // Reset env
    vi.stubEnv('DEV', false);
    delete (window as any).__TAURI__;
    vi.stubEnv('BASE_URL', '/');
  });

  it('should export readRegistryManifest function', async () => {
    const { readRegistryManifest } = await import('../../plugins/registry/quick-install');
    expect(typeof readRegistryManifest).toBe('function');
  });

  it('returns null when all paths fail', async () => {
    const { readRegistryManifest } = await import('../../plugins/registry/quick-install');
    // In web context with no server, all fetches will fail
    const result = await readRegistryManifest({
      id: 'nonexistent',
      name: 'Test',
      version: '1.0.0',
      description: 'Test',
      author: 'Test',
      tags: [],
      manifestUrl: 'nonexistent/manifest.json',
    });
    expect(result).toBeNull();
  });

  it('returns null for malformed manifest content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('not json'),
    });

    const { readRegistryManifest } = await import('../../plugins/registry/quick-install');
    const result = await readRegistryManifest({
      id: 'bad-json',
      name: 'Bad',
      version: '1.0.0',
      description: 'Bad',
      author: 'Bad',
      tags: [],
      manifestUrl: 'bad/manifest.json',
    });
    
    // The function returns null when JSON parsing fails, rather than throwing
    expect(result).toBeNull();

    vi.restoreAllMocks();
  });
});
