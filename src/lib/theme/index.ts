/**
 * F011 — 统一主题系统
 *
 * 支持四种主题（编辑器外壳 + 预览区域统一）：
 *   - light:          默认亮色（GitHub 风格）
 *   - dark:           暗色（GitHub Dark）
 *   - sepia:          护眼（黄褐色）
 *   - high-contrast:  高对比度
 */

import { BUILT_IN_NAMES, BUILT_IN_THEMES_MAP } from './registry';
import { StorageKeys } from '../storage-keys';

export type ThemeName = 'light' | 'dark' | 'sepia' | 'high-contrast' | (string & {});

/** 主题名联合类型（运行时用 string 检查，TS 用此类型约束） */
export type BuiltInThemeName = typeof BUILT_IN_NAMES[number];

/** Legacy types — kept for backward-compat migration only */
export type PreviewThemeName = 'default' | 'dark' | 'sepia' | 'highContrast';
/** @deprecated Use ThemeName instead */
export const PREVIEW_THEMES: Record<PreviewThemeName, { labelZh: string; labelEn: string; cssClass: string }> = {
  default: { labelZh: '默认', labelEn: 'Default', cssClass: '' },
  dark: { labelZh: '暗黑', labelEn: 'Dark', cssClass: 'markdown-preview-dark' },
  sepia: { labelZh: '护眼（浅绿）', labelEn: 'Eye Care (Green)', cssClass: 'markdown-preview-sepia' },
  highContrast: { labelZh: '高对比', labelEn: 'High Contrast', cssClass: 'markdown-preview-high-contrast' },
};

const PREVIEW_THEME_KEY = StorageKeys.PREVIEW_THEME;

/** @deprecated */
export function getSavedPreviewTheme(): PreviewThemeName {
  try {
    const saved = localStorage.getItem(PREVIEW_THEME_KEY);
    if (saved && saved in PREVIEW_THEMES) return saved as PreviewThemeName;
  } catch { /* ignore */ }
  return 'default';
}
/** @deprecated */
export function savePreviewTheme(_theme: PreviewThemeName): void {
  /* no-op — migrated to unified theme */
}

/** @deprecated Use THEMES[theme].previewClass instead */
export function getPreviewClass(_previewTheme: PreviewThemeName, _appTheme: ThemeName): string {
  return ''; // caller should use THEMES[theme].previewClass now
}

/** 主题定义 */
export interface ThemeConfig {
  /** 名称 */
  name: ThemeName;
  /** 显示标签（中文） */
  label: string;
  /** 英文标签 */
  labelEn: string;
  /** CSS 变量映射（注入到 :root 或容器上） */
  cssVars: Record<string, string>;
  /** CodeMirror 主题名 */
  cmTheme: 'light' | 'dark' | 'sepia' | 'high-contrast';
  /** 预览区域 CSS class */
  previewClass: string;
  /** 是否为深色主题 */
  isDark: boolean;
}

/** 内置主题注册表（从共享数据导入） */
export const BUILT_IN_THEMES: Record<string, ThemeConfig> = BUILT_IN_THEMES_MAP;

/** 向后兼容：THEMES = BUILT_IN_THEMES */
export const THEMES: Record<string, ThemeConfig> = BUILT_IN_THEMES;

/**
 * 应用主题（支持内置 + 自定义主题）
 */
export function applyTheme(theme: string): void {
  // 内置主题优先查找
  let config: ThemeConfig | undefined = BUILT_IN_THEMES[theme];
  if (!config) {
    // 自定义主题查找
    config = _getAllThemes().find(t => t.name === theme);
  }
  if (!config) return;

  // 注入 CSS 变量
  Object.entries(config.cssVars).forEach(([varName, value]) => {
    document.documentElement.style.setProperty(varName, value);
  });

  // 设置 color-scheme 以影响系统 UI 元素（滚动条等）
  document.documentElement.style.colorScheme = config.isDark ? 'dark' : 'light';
}

/**
 * 从 localStorage 读取已保存的主题偏好（支持自定义主题）
 */
import { getInstalledThemes as _getAllThemes } from './manager';
export function getSavedTheme(): string | null {
  try {
    const saved = localStorage.getItem(StorageKeys.THEME);
    if (!saved) return null;
    // 先查内置主题
    if (saved in BUILT_IN_THEMES) return saved;
    // 再查已安装的自定义主题
    const all = _getAllThemes();
    if (all.some(t => t.name === saved)) return saved;
    // 无效值 → 清除并返回 null
    localStorage.removeItem(StorageKeys.THEME);
    return null;
  } catch { /* ignore */ }
  return null;
}

/**
 * 保存主题偏好到 localStorage
 */
export function saveTheme(theme: string): void {
  try { localStorage.setItem(StorageKeys.THEME, theme); } catch { /* ignore */ }
}
