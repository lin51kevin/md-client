import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSnapshot,
  getSnapshots,
  deleteSnapshot,
  restoreSnapshot,
  clearSnapshots,
  formatSnapshotTime,
} from '../../../lib/storage';

describe('F012 — 版本历史（本地快照）', () => {
  const TEST_FILE = '/test/docs.md';

  beforeEach(() => {
    clearSnapshots(TEST_FILE);
  });

  afterEach(() => {
    clearSnapshots(TEST_FILE);
  });

  describe('createSnapshot', () => {
    it('应创建快照并返回列表', () => {
      const snaps = createSnapshot(TEST_FILE, 'Hello World');
      expect(snaps).toHaveLength(1);
      expect(snaps[0].contentLength).toBe(11);
      expect(snaps[0].id).toContain('snap-');
      expect(snaps[0].timestamp).toBeTruthy();
    });

    it('多次创建应追加到列表', () => {
      createSnapshot(TEST_FILE, 'v1');
      createSnapshot(TEST_FILE, 'v2');
      const snaps = getSnapshots(TEST_FILE);
      expect(snaps).toHaveLength(2);
      expect(snaps[0].preview).toBe('v1');
      expect(snaps[1].preview).toBe('v2');
    });

    it('连续相同内容不应重复创建快照', () => {
      createSnapshot(TEST_FILE, 'same content here');
      const snaps2 = createSnapshot(TEST_FILE, 'same content here');
      expect(snaps2).toHaveLength(1); // 去重
    });

    it('超过上限时应移除最旧的快照', () => {
      for (let i = 0; i < 25; i++) {
        createSnapshot(TEST_FILE, `version-${i}`);
      }
      const snaps = getSnapshots(TEST_FILE);
      expect(snaps.length).toBeLessThanOrEqual(20);
      // 最新的应该还在
      expect(snaps[snaps.length - 1].preview).toBe('version-24');
    });
  });

  describe('getSnapshots', () => {
    it('无快照时应返回空数组', () => {
      expect(getSnapshots(TEST_FILE)).toEqual([]);
    });

    it('创建后应能读取到相同数据', () => {
      createSnapshot(TEST_FILE, '测试内容');
      const snaps = getSnapshots(TEST_FILE);
      expect(snaps).toHaveLength(1);
      expect(snaps[0].preview).toBe('测试内容');
    });
  });

  describe('deleteSnapshot', () => {
    it('应删除指定快照', () => {
      createSnapshot(TEST_FILE, 'a');
      createSnapshot(TEST_FILE, 'b');
      const snaps = getSnapshots(TEST_FILE);
      const remaining = deleteSnapshot(TEST_FILE, snaps[0].id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].preview).toBe('b');
    });

    it('删除不存在的 ID 不应影响其他快照', () => {
      createSnapshot(TEST_FILE, 'a');
      const remaining = deleteSnapshot(TEST_FILE, 'non-existent-id');
      expect(remaining).toHaveLength(1);
    });
  });

  describe('restoreSnapshot', () => {
    it('应恢复指定快照的内容', () => {
      createSnapshot(TEST_FILE, 'version 1');
      const snaps = getSnapshots(TEST_FILE);
      const content = restoreSnapshot(TEST_FILE, snaps[0].id);
      expect(content).toBe('version 1');
    });

    it('ID 不存在时应返回 null', () => {
      const content = restoreSnapshot(TEST_FILE, 'nonexistent-id');
      expect(content).toBeNull();
    });

    it('应恢复指定版本而不是最新版本', () => {
      createSnapshot(TEST_FILE, 'v1 content');
      createSnapshot(TEST_FILE, 'v2 content');
      const snaps = getSnapshots(TEST_FILE);
      const content = restoreSnapshot(TEST_FILE, snaps[0].id); // oldest
      expect(content).toBe('v1 content');
    });
  });

  describe('storageKey 碰撞防护', () => {
    const FILE_WITH_SLASH  = '/foo/bar.md';    // 旧实现 → "_foo-bar_md"
    const FILE_WITH_HYPHEN = '/foo-bar.md';    // 旧实现 → "_foo-bar_md" (碰撞!)

    afterEach(() => {
      clearSnapshots(FILE_WITH_SLASH);
      clearSnapshots(FILE_WITH_HYPHEN);
    });

    it('路径中含分隔符与含连字符的文件应使用不同的存储 key', () => {
      createSnapshot(FILE_WITH_SLASH,  'content for foo/bar.md');
      createSnapshot(FILE_WITH_HYPHEN, 'content for foo-bar.md');

      // 每个文件应独立存储，互不干扰
      expect(getSnapshots(FILE_WITH_SLASH)).toHaveLength(1);
      expect(getSnapshots(FILE_WITH_HYPHEN)).toHaveLength(1);
      expect(getSnapshots(FILE_WITH_SLASH)[0].content).toBe('content for foo/bar.md');
      expect(getSnapshots(FILE_WITH_HYPHEN)[0].content).toBe('content for foo-bar.md');
    });

    it('Windows 路径与同名含连字符路径应独立存储', () => {
      const winPath   = 'C:\\Users\\docs\\my-file.md';
      const unixStyle = 'C:/Users/docs/my-file.md';
      createSnapshot(winPath,   'windows content');
      createSnapshot(unixStyle, 'unix style content');

      expect(getSnapshots(winPath)[0].content).toBe('windows content');
      expect(getSnapshots(unixStyle)[0].content).toBe('unix style content');

      clearSnapshots(winPath);
      clearSnapshots(unixStyle);
    });
  });

  describe('clearSnapshots', () => {
    it('应清空所有快照', () => {
      createSnapshot(TEST_FILE, 'x');
      createSnapshot(TEST_FILE, 'y');
      clearSnapshots(TEST_FILE);
      expect(getSnapshots(TEST_FILE)).toEqual([]);
    });
  });

  describe('formatSnapshotTime', () => {
    it('刚刚（<1分钟）', () => {
      const now = new Date().toISOString();
      expect(formatSnapshotTime(now)).toBe('刚刚');
    });

    it('N 分钟前', () => {
      const date = new Date(Date.now() - 5 * 60000).toISOString();
      expect(formatSnapshotTime(date)).toContain('分钟前');
    });

    it('N 小时前', () => {
      const date = new Date(Date.now() - 3 * 3600000).toISOString();
      expect(formatSnapshotTime(date)).toContain('小时前');
    });

    it('N 天前', () => {
      const date = new Date(Date.now() - 5 * 86400000).toISOString();
      expect(formatSnapshotTime(date)).toContain('天前');
    });
  });
});
