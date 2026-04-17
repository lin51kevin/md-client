/**
 * F015 — 深色主题跟随系统设置
 *
 * 支持三种主题偏好：
 * - system: 跟随操作系统深色模式（默认）
 * - light:  强制亮色
 * - dark:   强制暗色
 *
 * 用户在 Toolbar 切换时会覆盖 preference，
 * 但 preference 本身持久化用户的手动选择。
 */

import { StorageKeys } from '../storage-keys';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = StorageKeys.THEME_PREFERENCE;

/**
 * 读取用户主题偏好（默认 system）
 */
export function getThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch { /* ignore */ }
  return 'system';
}

/**
 * 保存用户主题偏好
 */
export function setThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch { /* ignore */ }
}

/**
 * 根据用户偏好和系统主题解析出实际应用的主题
 *
 * @param preference  用户选择（system/light/dark）
 * @param systemTheme 当前系统主题（由 Tauri onThemeChanged 事件传入）
 */
export function resolveEffectiveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  if (preference === 'system') {
    return systemTheme;
  }
  return preference;
}
