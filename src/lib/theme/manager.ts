/**
 * 主题管理器 — 外部主题加载与管理 API
 *
 * 支持：
 * - 从 JSON 字符串加载外部主题（格式验证）
 * - 安装 / 卸载自定义主题
 * - 获取所有可用主题（内置 + 已安装）
 */

import type { ThemeConfig } from '.';
import { getStoredThemes, storeTheme, removeStoredTheme } from './storage';
import { BUILT_IN_THEMES_MAP } from './registry';

// ─── Required CSS variables that every theme must define ──────────────────

const REQUIRED_CSS_VARS = [
  '--bg-primary', '--bg-secondary', '--bg-tertiary',
  '--text-primary', '--text-secondary', '--text-tertiary',
  '--border-color',
  '--accent-color', '--accent-hover', '--accent-bg',
  '--hover-bg', '--hover-overlay',
  '--warning-color', '--warning-bg',
];

import { BUILT_IN_NAMES } from './registry';

const BUILT_IN_SET = new Set<string>(BUILT_IN_NAMES);

// ─── Public Types ────────────────────────────────────────────────────────

export interface ExternalThemeConfig extends ThemeConfig {
  author?: string;
  version?: string;
  description?: string;
  thumbnail?: string; // base64 data URI or URL
}

// ─── Validation ─────────────────────────────────────────────────────────

function validateThemeJson(obj: unknown): asserts obj is ExternalThemeConfig {
  if (!obj || typeof obj !== 'object') throw new Error('theme-manager: invalid JSON root');
  const t = obj as Record<string, unknown>;

  // Required fields
  if (typeof t.name !== 'string' || !t.name) throw new Error('theme-manager: missing "name"');
  if (typeof t.label !== 'string' || !t.label) throw new Error('theme-manager: missing "label"');

  // No conflict with built-in themes
  if (BUILT_IN_SET.has(t.name)) {
    throw new Error(`theme-manager: name "${t.name}" conflicts with built-in theme`);
  }

  // cssVars must be an object containing required vars
  if (!t.cssVars || typeof t.cssVars !== 'object' || Array.isArray(t.cssVars)) {
    throw new Error('theme-manager: "cssVars" must be a non-null object');
  }
  const cv = t.cssVars as Record<string, unknown>;
  for (const v of REQUIRED_CSS_VARS) {
    if (typeof cv[v] !== 'string' || !cv[v]) {
      throw new Error(`theme-manager: missing or empty CSS variable "${v}"`);
    }
  }

  // Optional fields defaults
  if (typeof t.isDark !== 'boolean') t.isDark = false;
  if (typeof t.cmTheme !== 'string') t.cmTheme = 'light';
  if (typeof t.previewClass !== 'string') t.previewClass = '';
  if (typeof t.labelEn !== 'string') t.labelEn = t.label as string;
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * 从 JSON 字符串解析并验证一个外部主题。
 *
 * @throws 当 JSON 格式不完整或与内置主题冲突时
 */
export async function loadThemeFromJson(json: string): Promise<ExternalThemeConfig> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error('theme-manager: invalid JSON syntax');
  }
  validateThemeJson(parsed);
  return parsed as ExternalThemeConfig;
}

/**
 * 获取所有可用主题：内置主题 + 用户已安装的自定义主题
 */
export function getInstalledThemes(): ThemeConfig[] {
  return [...Object.values(BUILT_IN_THEMES_MAP), ...getStoredThemes()];
}

/**
 * 安装一个自定义主题（持久化到 localStorage）
 */
export function installTheme(theme: ExternalThemeConfig): void {
  storeTheme(theme);
}

/**
 * 删除一个自定义主题。内置主题会被静默忽略。
 */
export function removeTheme(name: string): void {
  removeStoredTheme(name);
}

/**
 * 将指定主题配置导出为可导入的 JSON 字符串。
 * 用户可据此修改后重新导入为自定义主题。
 */
export function exportThemeAsJson(theme: ThemeConfig): string {
  const exportObj: Record<string, unknown> = {
    name: `${theme.name}-custom`,
    label: `${theme.label} (Custom)`,
    isDark: theme.isDark,
    cmTheme: theme.cmTheme,
    cssVars: { ...theme.cssVars },
  };
  return JSON.stringify(exportObj, null, 2);
}

/**
 * 检查是否为内置主题名
 */
export function isBuiltInTheme(name: string): boolean {
  return BUILT_IN_SET.has(name);
}
