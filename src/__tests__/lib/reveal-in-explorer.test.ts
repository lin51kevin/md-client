import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revealInExplorer } from '../../lib/reveal-in-explorer';

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = invoke as unknown as ReturnType<typeof vi.fn>;

describe('revealInExplorer', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('should invoke reveal_in_explorer with the given path', async () => {
    mockInvoke.mockResolvedValue(undefined);
    await revealInExplorer('/home/user/test.md');
    expect(mockInvoke).toHaveBeenCalledWith('reveal_in_explorer', { path: '/home/user/test.md' });
  });

  it('should throw on error', async () => {
    mockInvoke.mockRejectedValue(new Error('Not found'));
    await expect(revealInExplorer('/bad/path')).rejects.toThrow('Not found');
  });
});
