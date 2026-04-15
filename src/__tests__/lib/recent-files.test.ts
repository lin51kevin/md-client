import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRecentFiles,
  addRecentFile,
  removeRecentFile,
  clearRecentFiles,
  type RecentFile,
} from '../../lib/recent-files';

const STORAGE_KEY = 'marklite-recent-files';

describe('getRecentFiles', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty array when nothing stored', () => {
    expect(getRecentFiles()).toEqual([]);
  });

  it('returns stored entries', () => {
    const entries: RecentFile[] = [{ path: '/a/b.md', name: 'b.md', openedAt: '2024-01-01T00:00:00.000Z' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    expect(getRecentFiles()).toEqual(entries);
  });

  it('returns empty array on invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json{{');
    expect(getRecentFiles()).toEqual([]);
  });
});

describe('addRecentFile', () => {
  beforeEach(() => localStorage.clear());

  it('adds a new file to the front', () => {
    const result = addRecentFile('/home/user/notes.md');
    expect(result[0].path).toBe('/home/user/notes.md');
    expect(result[0].name).toBe('notes.md');
  });

  it('extracts filename from unix path', () => {
    const result = addRecentFile('/home/user/docs/readme.md');
    expect(result[0].name).toBe('readme.md');
  });

  it('extracts filename from windows path', () => {
    const result = addRecentFile('C:\\Users\\user\\docs\\readme.md');
    expect(result[0].name).toBe('readme.md');
  });

  it('moves existing entry to the front (deduplication)', () => {
    addRecentFile('/a.md');
    addRecentFile('/b.md');
    addRecentFile('/a.md'); // re-open /a.md
    const result = getRecentFiles();
    expect(result[0].path).toBe('/a.md');
    expect(result.filter(f => f.path === '/a.md').length).toBe(1);
  });

  it('caps at 8 entries (MAX_RECENT)', () => {
    for (let i = 0; i < 10; i++) {
      addRecentFile(`/file${i}.md`);
    }
    expect(getRecentFiles().length).toBe(8);
  });

  it('most-recently added file is always first', () => {
    addRecentFile('/old.md');
    addRecentFile('/new.md');
    expect(getRecentFiles()[0].path).toBe('/new.md');
  });

  it('persists to localStorage', () => {
    addRecentFile('/x.md');
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed[0].path).toBe('/x.md');
  });

  it('sets an ISO openedAt timestamp', () => {
    const result = addRecentFile('/t.md');
    expect(() => new Date(result[0].openedAt)).not.toThrow();
    expect(new Date(result[0].openedAt).toISOString()).toBe(result[0].openedAt);
  });
});

describe('removeRecentFile', () => {
  beforeEach(() => localStorage.clear());

  it('removes the specified file', () => {
    addRecentFile('/a.md');
    addRecentFile('/b.md');
    const result = removeRecentFile('/a.md');
    expect(result.find(f => f.path === '/a.md')).toBeUndefined();
  });

  it('leaves other entries intact', () => {
    addRecentFile('/a.md');
    addRecentFile('/b.md');
    const result = removeRecentFile('/a.md');
    expect(result.find(f => f.path === '/b.md')).toBeTruthy();
  });

  it('is a no-op when path not found', () => {
    addRecentFile('/a.md');
    const before = getRecentFiles().length;
    removeRecentFile('/nonexistent.md');
    expect(getRecentFiles().length).toBe(before);
  });

  it('persists updated list', () => {
    addRecentFile('/a.md');
    addRecentFile('/b.md');
    removeRecentFile('/a.md');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.find((f: RecentFile) => f.path === '/a.md')).toBeUndefined();
  });
});

describe('clearRecentFiles', () => {
  beforeEach(() => localStorage.clear());

  it('removes all entries', () => {
    addRecentFile('/a.md');
    addRecentFile('/b.md');
    clearRecentFiles();
    expect(getRecentFiles()).toEqual([]);
  });

  it('removes the localStorage key', () => {
    addRecentFile('/a.md');
    clearRecentFiles();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('is safe to call on empty list', () => {
    expect(() => clearRecentFiles()).not.toThrow();
  });
});
