/**
 * 主题持久化存储 — localStorage
 *
 * 管理用户安装的外部主题，支持：
 * - CRUD 操作
 * - 版本检查与迁移
 * - 内置主题保护（不可删除）
 */

import type { ExternalThemeConfig } from './manager';
import { isBuiltInTheme } from './manager';
import { StorageKeys } from '../storage';

export const THEME_STORAGE_KEY = StorageKeys.CUSTOM_THEMES;

/** 存储格式版本 */
const STORAGE_VERSION = 1;

interface ThemeStore {
  version: number;
  themes: ExternalThemeConfig[];
}

function getStore(): ThemeStore {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { version: STORAGE_VERSION, themes: [] };
    const store: unknown = JSON.parse(raw);
    if (typeof store === 'object' && store !== null && 'version' in store && Array.isArray((store as Record<string, unknown>).themes)) {
      return store as ThemeStore;
    }
    // 格式不匹配 → 重置
    return { version: STORAGE_VERSION, themes: [] };
  } catch {
    return { version: STORAGE_VERSION, themes: [] };
  }
}

function saveStore(store: ThemeStore): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore quota etc */ }
}

/** 获取所有已安装的自定义主题 */
export function getStoredThemes(): ExternalThemeConfig[] {
  return getStore().themes;
}

/** 安装 / 更新主题 */
export function storeTheme(theme: ExternalThemeConfig): void {
  if (isBuiltInTheme(theme.name as string)) return;
  const store = getStore();
  const idx = store.themes.findIndex(t => t.name === theme.name);
  if (idx >= 0) {
    store.themes[idx] = theme;
  } else {
    store.themes.push(theme);
  }
  saveStore(store);
}

/** 删除自定义主题 */
export function removeStoredTheme(name: string): void {
  if (isBuiltInTheme(name)) return;
  const store = getStore();
  store.themes = store.themes.filter(t => t.name !== name);
  saveStore(store);
}
