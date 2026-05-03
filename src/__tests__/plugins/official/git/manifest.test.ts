import { describe, it, expect } from 'vitest';

describe('marklite-git manifest', () => {
  it('loads and has correct id', async () => {
    const manifest = await import('../../../../plugins/official/git/manifest.json');
    expect(manifest.id).toBe('marklite-git');
  });

  it('has required metadata fields', async () => {
    const m = await import('../../../../plugins/official/git/manifest.json');
    expect(m.name).toBeTruthy();
    expect(m.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(m.description).toBeTruthy();
    expect(m.author).toBeTruthy();
    expect(m.main).toBeTruthy();
  });

  it('declares onWorkspaceReady activation event', async () => {
    const m = await import('../../../../plugins/official/git/manifest.json');
    expect(m.activationEvents).toContain('onWorkspaceReady');
  });

  it('requires sidebar.panel, git.command, and commands permissions', async () => {
    const m = await import('../../../../plugins/official/git/manifest.json');
    expect(m.permissions).toContain('sidebar.panel');
    expect(m.permissions).toContain('git.command');
    expect(m.permissions).toContain('commands');
  });

  it('declares engine compatibility', async () => {
    const m = await import('../../../../plugins/official/git/manifest.json');
    expect(m.engines).toBeDefined();
    expect(m.engines.marklite).toBeTruthy();
  });
});
