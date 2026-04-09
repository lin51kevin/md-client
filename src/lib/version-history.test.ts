import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSnapshot,
  getSnapshots,
  deleteSnapshot,
  clearSnapshots,
  formatSnapshotTime,
} from './version-history';

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
