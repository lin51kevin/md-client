/**
 * 内置主题数据（纯数据，无副作用）
 *
 * 被 theme.ts 和 theme-manager.ts 共享，避免循环依赖。
 */

import type { ThemeConfig } from '.';

export const BUILT_IN_NAMES = ['light', 'dark', 'sepia', 'high-contrast'] as const;

/** 内置主题注册表 */
export const BUILT_IN_THEMES_MAP: Record<string, ThemeConfig> = {
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
    cmTheme: 'sepia',
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
    cmTheme: 'high-contrast',
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
