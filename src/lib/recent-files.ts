/**
 * F013 — 最近打开文件列表
 *
 * 存储最近打开的文件路径（最多 MAX_RECENT 个），
 * 用于工具栏「最近文件」下拉菜单。
 */

export interface RecentFile {
  /** 完整文件路径 */
  path: string;
  /** 文件名（显示用） */
  name: string;
  /** 打开时间 (ISO) */
  openedAt: string;
}

const STORAGE_KEY = 'md-client-recent-files';
const MAX_RECENT = 10;

/**
 * 从 localStorage 读取最近文件列表
 */
export function getRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentFile[];
  } catch {
    return [];
  }
}

/**
 * 添加或置顶一个最近文件（已在列表中则移到最前）
 */
export function addRecentFile(filePath: string): RecentFile[] {
  const name = filePath.split(/[\\/]/).pop() ?? filePath;
  const entry: RecentFile = { path: filePath, name, openedAt: new Date().toISOString() };

  const existing = getRecentFiles();
  const filtered = existing.filter(f => f.path !== filePath);
  const updated = [entry, ...filtered].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* ignore quota errors */ }

  return updated;
}

/**
 * 清空最近文件列表
 */
export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/**
 * 移除单条最近文件记录
 */
export function removeRecentFile(filePath: string): RecentFile[] {
  const updated = getRecentFiles().filter(f => f.path !== filePath);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* ignore quota errors */ }
  return updated;
}
