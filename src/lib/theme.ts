/**
 * F011 — 深色模式与主题切换
 *
 * 支持两种主题：
 *   - light:    默认亮色（GitHub 风格）
 *   - dark:     暗色（GitHub Dark）
 */

export type ThemeName = 'light' | 'dark';

/** 主题定义 */
export interface ThemeConfig {
  /** 名称 */
  name: ThemeName;
  /** 显示标签 */
  label: string;
  /** CSS 变量映射（注入到 :root 或容器上） */
  cssVars: Record<string, string>;
  /** CodeMirror 主题名 */
  cmTheme: 'light' | 'dark';
  /** 是否为深色主题 */
  isDark: boolean;
}

/** 内置主题注册表 */
export const THEMES: Record<ThemeName, ThemeConfig> = {
  light: {
    name: 'light',
    label: '☀️ 亮色',
    cmTheme: 'light',
    isDark: false,
    cssVars: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f6f8fa',
      '--bg-tertiary': '#eaecef',
      '--text-primary': '#1f2328',
      '--text-secondary': '#656d76',
      '--border-color': '#d0d7de',
      '--accent-color': '#0969da',
      '--accent-hover': '#0550ae',
    },
  },
  dark: {
    name: 'dark',
    label: '🌙 暗色',
    cmTheme: 'dark',
    isDark: true,
    cssVars: {
      '--bg-primary': '#0d1117',
      '--bg-secondary': '#161b22',
      '--bg-tertiary': '#21262d',
      '--text-primary': '#e6edf3',
      '--text-secondary': '#8b949e',
      '--border-color': '#30363d',
      '--accent-color': '#58a6ff',
      '--accent-hover': '#79c0ff',
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
    const saved = localStorage.getItem('md-client-theme');
    if (saved && saved in THEMES) return saved as ThemeName;
  } catch { /* ignore */ }
  return null;
}

/**
 * 保存主题偏好到 localStorage
 */
export function saveTheme(theme: ThemeName): void {
  try { localStorage.setItem('md-client-theme', theme); } catch { /* ignore */ }
}
