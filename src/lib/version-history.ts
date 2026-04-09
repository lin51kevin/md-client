/**
 * F012 — 版本历史（本地快照）
 *
 * 基于 localStorage 的轻量版本控制系统。
 * 每次手动保存时自动创建快照（最多保留 N 个）。
 * 支持浏览和恢复到任意历史版本。
 */

export interface Snapshot {
  /** 快照唯一 ID */
  id: string;
  /** 快照时间戳 (ISO) */
  timestamp: string;
  /** 内容长度（用于显示摘要） */
  contentLength: number;
  /** 前50字符预览 */
  preview: string;
  /** 实际文件内容（用于恢复） */
  content: string;
}

/** 默认最大快照数 */
const MAX_SNAPSHOTS = 20;

/** localStorage key 前缀 */
const STORAGE_KEY_PREFIX = 'md-client-snapshot-';

/**
 * 生成快照存储 key
 */
function storageKey(filePath: string): string {
  const hash = filePath
    .split('/')
    .join('-')
    .split('\\')
    .join('-')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${STORAGE_KEY_PREFIX}${hash}`;
}

/**
 * 获取某文件的所有快照
 */
export function getSnapshots(filePath: string): Snapshot[] {
  try {
    const raw = localStorage.getItem(storageKey(filePath));
    if (!raw) return [];
    return JSON.parse(raw) as Snapshot[];
  } catch {
    return [];
  }
}

/**
 * 创建新快照
 *
 * @param filePath - 文件路径
 * @param content - 文件当前内容
 * @param maxSnapshots - 最大保留数（默认 20）
 * @returns 创建后的完整快照列表
 */
export function createSnapshot(filePath: string, content: string, maxSnapshots = MAX_SNAPSHOTS): Snapshot[] {
  const snapshots = getSnapshots(filePath);

  // 去重：内容与上一个快照完全相同时跳过
  if (snapshots.length > 0 && snapshots[snapshots.length - 1].content === content) {
    return snapshots;
  }

  const snapshot: Snapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    contentLength: content.length,
    preview: content.slice(0, 50).replace(/\n/g, '↵'),
    content,
  };

  snapshots.push(snapshot);

  // 超出上限时移除最旧的
  if (snapshots.length > maxSnapshots) {
    snapshots.splice(0, snapshots.length - maxSnapshots);
  }

  persistSnapshots(filePath, snapshots);
  return snapshots;
}

/**
 * 删除单个快照
 */
export function restoreSnapshot(filePath: string, snapshotId: string): string | null {
  const snapshots = getSnapshots(filePath);
  const snapshot = snapshots.find(s => s.id === snapshotId);
  return snapshot?.content ?? null;
}

export function deleteSnapshot(filePath: string, snapshotId: string): Snapshot[] {
  const snapshots = getSnapshots(filePath);
  const filtered = snapshots.filter(s => s.id !== snapshotId);
  persistSnapshots(filePath, filtered);
  return filtered;
}

/**
 * 清空某文件的所有快照
 */
export function clearSnapshots(filePath: string): void {
  try {
    localStorage.removeItem(storageKey(filePath));
  } catch { /* ignore */ }
}

/**
 * 格式化时间戳为可读字符串
 */
export function formatSnapshotTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;

  // 超过一周显示日期
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * 持久化快照列表到 localStorage
 */
function persistSnapshots(filePath: string, snapshots: Snapshot[]): void {
  try {
    localStorage.setItem(storageKey(filePath), JSON.stringify(snapshots));
  } catch { /* ignore quota errors */ }
}
