import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

// Mock localStorage
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
});

import { restoreSession } from '../../../lib/storage/tab-session';

const SESSION_KEY = 'marklite-session-tabs';

describe('restoreSession batch', () => {
  beforeEach(() => {
    store.clear();
    mockInvoke.mockReset();
  });

  it('calls restore_session_files once for multiple tabs', async () => {
    const session = {
      tabs: [
        { id: '1', filePath: '/a.md' },
        { id: '2', filePath: '/b.md' },
        { id: '3', filePath: '/c.md' },
      ],
      activeTabId: '2',
    };
    store.set(SESSION_KEY, JSON.stringify(session));

    mockInvoke.mockResolvedValue([
      ['/a.md', 'content A'],
      ['/b.md', 'content B'],
      ['/c.md', 'content C'],
    ]);

    const result = await restoreSession();

    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith('restore_session_files', {
      paths: ['/a.md', '/b.md', '/c.md'],
    });
    expect(result).toEqual({
      tabs: [
        { id: '1', filePath: '/a.md', doc: 'content A', isDirty: false, displayName: undefined, isPinned: undefined },
        { id: '2', filePath: '/b.md', doc: 'content B', isDirty: false, displayName: undefined, isPinned: undefined },
        { id: '3', filePath: '/c.md', doc: 'content C', isDirty: false, displayName: undefined, isPinned: undefined },
      ],
      activeTabId: '2',
    });
  });

  it('skips tabs with empty content (failed reads)', async () => {
    const session = {
      tabs: [
        { id: '1', filePath: '/exists.md' },
        { id: '2', filePath: '/deleted.md' },
      ],
      activeTabId: '1',
    };
    store.set(SESSION_KEY, JSON.stringify(session));

    mockInvoke.mockResolvedValue([
      ['/exists.md', 'hello'],
      ['/deleted.md', ''],
    ]);

    const result = await restoreSession();

    expect(result!.tabs).toHaveLength(1);
    expect(result!.tabs[0].id).toBe('1');
  });

  it('returns null when no session exists', async () => {
    const result = await restoreSession();
    expect(result).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
