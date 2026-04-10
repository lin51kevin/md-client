/**
 * F011 — 统一主题系统
 *
 * 支持四种主题（编辑器外壳 + 预览区域统一）：
 *   - light:          默认亮色（GitHub 风格）
 *   - dark:           暗色（GitHub Dark）
 *   - sepia:          护眼（黄褐色）
 *   - high-contrast:  高对比度
 */

export type ThemeName = 'light' | 'dark' | 'sepia' | 'high-contrast';

/** Legacy types — kept for backward-compat migration only */
export type PreviewThemeName = 'default' | 'dark' | 'sepia' | 'highContrast';
/** @deprecated Use ThemeName instead */
export const PREVIEW_THEMES: Record<PreviewThemeName, { labelZh: string; labelEn: string; cssClass: string }> = {
  default: { labelZh: '默认', labelEn: 'Default', cssClass: '' },
  dark: { labelZh: '暗黑', labelEn: 'Dark', cssClass: 'markdown-preview-dark' },
  sepia: { labelZh: '护眼（浅绿）', labelEn: 'Eye Care (Green)', cssClass: 'markdown-preview-sepia' },
  highContrast: { labelZh: '高对比', labelEn: 'High Contrast', cssClass: 'markdown-preview-high-contrast' },
};

const PREVIEW_THEME_KEY = 'marklite-preview-theme';

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
  cmTheme: 'light' | 'dark';
  /** 预览区域 CSS class */
  previewClass: string;
  /** 是否为深色主题 */
  isDark: boolean;
}

/** 内置主题注册表 */
export const THEMES: Record<ThemeName, ThemeConfig> = {
  light: {
    name: 'light',
    label: '☀️ 浅色',
    labelEn: 'Light',
    cmTheme: 'light',
    previewClass: '',
    isDark: false,
    cssVars: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f6f8fa',
      '--bg-tertiary': '#eaecef',
      '--text-primary': '#1f2328',
      '--text-secondary': '#656d76',
      '--text-tertiary': '#9ca3af',
      '--border-color': '#d0d7de',
      '--accent-color': '#0969da',
      '--accent-hover': '#0550ae',
      '--accent-bg': '#ddf4ff',
      '--hover-bg': '#f3f4f6',
      '--hover-overlay': 'rgba(0, 0, 0, 0.05)',
      '--warning-color': '#f59e0b',
      '--warning-bg': '#fef3c7',
    },
  },
  dark: {
    name: 'dark',
    label: '🌙 深色',
    labelEn: 'Dark',
    cmTheme: 'dark',
    previewClass: 'markdown-preview-dark',
    isDark: true,
    cssVars: {
      '--bg-primary': '#0d1117',
      '--bg-secondary': '#161b22',
      '--bg-tertiary': '#21262d',
      '--text-primary': '#f0f6fc',
      '--text-secondary': '#adbac7',
      '--text-tertiary': '#6e7681',
      '--border-color': '#30363d',
      '--accent-color': '#58a6ff',
      '--accent-hover': '#79c0ff',
      '--accent-bg': '#1c2d41',
      '--hover-bg': '#21262d',
      '--hover-overlay': 'rgba(255, 255, 255, 0.1)',
      '--warning-color': '#f59e0b',
      '--warning-bg': '#3e2c0a',
    },
  },
  sepia: {
    name: 'sepia',
    label: '📖 护眼',
    labelEn: 'Sepia (Eye Care)',
    cmTheme: 'light',
    previewClass: 'markdown-preview-sepia',
    isDark: false,
    cssVars: {
      '--bg-primary': '#f4ecd8',
      '--bg-secondary': '#efe5cd',
      '--bg-tertiary': '#e8dcc0',
      '--text-primary': '#3b3228',
      '--text-secondary': '#695d4e',
      '--text-tertiary': '#9a8b75',
      '--border-color': '#d4c9ab',
      '--accent-color': '#8b6914',
      '--accent-hover': '#6b5010',
      '--accent-bg': '#f9f0d1',
      '--hover-bg': '#efe5cd',
      '--hover-overlay': 'rgba(0, 0, 0, 0.05)',
      '--warning-color': '#b8860b',
      '--warning-bg': '#f5e6b8',
    },
  },
  'high-contrast': {
    name: 'high-contrast',
    label: '◻️ 高对比',
    labelEn: 'High Contrast',
    cmTheme: 'light',
    previewClass: 'markdown-preview-high-contrast',
    isDark: false,
    cssVars: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#eeeeee',
      '--text-primary': '#000000',
      '--text-secondary': '#222222',
      '--text-tertiary': '#444444',
      '--border-color': '#000000',
      '--accent-color': '#0000cc',
      '--accent-hover': '#000099',
      '--accent-bg': '#eeeeff',
      '--hover-bg': '#f0f0f0',
      '--hover-overlay': 'rgba(0, 0, 0, 0.08)',
      '--warning-color': '#cc5500',
      '--warning-bg': '#fff0e0',
    },
  },
};

/**
 * 将主题 CSS 变量注入到 document.documentElement
 */
export function applyTheme(theme: ThemeName): void {
  const config = THEMES[theme];
  if (!config) return;

  // 注入 CSS 变量
  Object.entries(config.cssVars).forEach(([varName, value]) => {
    document.documentElement.style.setProperty(varName, value);
  });

  // 设置 color-scheme 以影响系统 UI 元素（滚动条等）
  document.documentElement.style.colorScheme = config.isDark ? 'dark' : 'light';
}

/**
 * 从 localStorage 读取已保存的主题偏好
 */
export function getSavedTheme(): ThemeName | null {
  try {
    const saved = localStorage.getItem('marklite-theme');
    if (saved && saved in THEMES) return saved as ThemeName;
  } catch { /* ignore */ }
  return null;
}

/**
 * 保存主题偏好到 localStorage
 */
export function saveTheme(theme: ThemeName): void {
  try { localStorage.setItem('marklite-theme', theme); } catch { /* ignore */ }
}
