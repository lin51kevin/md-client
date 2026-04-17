import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadThemeFromJson,
  getInstalledThemes,
  installTheme,
  removeTheme,
  isBuiltInTheme,
} from '../../../lib/theme/manager';
import type { ExternalThemeConfig } from '../../../lib/theme/manager';

const SAMPLE_THEME_JSON = JSON.stringify({
  name: 'custom-ocean',
  label: '🌊 海洋',
  labelEn: 'Ocean',
  author: 'test-author',
  version: '1.0.0',
  description: 'A calm ocean theme',
  isDark: false,
  cmTheme: 'light',
  previewClass: '',
  cssVars: {
    '--bg-primary': '#e6f2f5',
    '--bg-secondary': '#d1e7eC',
    '--bg-tertiary': '#bdd8df',
    '--text-primary': '#1a3a40',
    '--text-secondary': '#4a6a70',
    '--text-tertiary': '#7a9aa0',
    '--border-color': '#99c0c8',
    '--accent-color': '#0077aa',
    '--accent-hover': '#005588',
    '--accent-bg': '#d9ecf5',
    '--hover-bg': '#d1e7ec',
    '--hover-overlay': 'rgba(0, 0, 0, 0.05)',
    '--warning-color': '#e67e22',
    '--warning-bg': '#fdf0db',
  },
});

describe('theme-manager — 外部主题加载与管理', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('loadThemeFromJson', () => {
    it('应能解析外部主题 JSON 字符串', async () => {
      const theme = await loadThemeFromJson(SAMPLE_THEME_JSON);
      expect(theme.name).toBe('custom-ocean');
      expect(theme.label).toBe('🌊 海洋');
      expect(theme.author).toBe('test-author');
      expect(theme.version).toBe('1.0.0');
    });

    it('应验证必要字段：name / label / cssVars', async () => {
      const badJson = JSON.stringify({ name: 'bad' });
      await expect(loadThemeFromJson(badJson)).rejects.toThrow();
    });

    it('应验证 cssVars 包含必要的 CSS 变量', async () => {
      const incomplete = JSON.stringify({
        name: 'incomplete',
        label: 'Bad',
        isDark: false,
        cmTheme: 'light' as const,
        previewClass: '',
        cssVars: { '--bg-primary': '#fff' },
      });
      await expect(loadThemeFromJson(incomplete)).rejects.toThrow();
    });

    it('应拒绝 name 与内置主题冲突的外部主题', async () => {
      const conflict = JSON.stringify({
        name: 'dark',
        label: 'Conflict',
        isDark: true,
        cmTheme: 'dark' as const,
        previewClass: 'markdown-preview-dark',
        cssVars: { ...JSON.parse(SAMPLE_THEME_JSON).cssVars },
      });
      await expect(loadThemeFromJson(conflict)).rejects.toThrow();
    });
  });

  describe('installTheme / removeTheme / getInstalledThemes', () => {
    it('安装后 getInstalledThemes 应包含新主题', () => {
      const theme: ExternalThemeConfig = JSON.parse(SAMPLE_THEME_JSON);
      installTheme(theme);
      const themes = getInstalledThemes();
      expect(themes.find(t => t.name === 'custom-ocean')).toBeDefined();
    });

    it('删除自定义主题后不应再出现', () => {
      const theme: ExternalThemeConfig = JSON.parse(SAMPLE_THEME_JSON);
      installTheme(theme);
      removeTheme('custom-ocean');
      const themes = getInstalledThemes();
      expect(themes.find(t => t.name === 'custom-ocean')).toBeUndefined();
    });

    it('内置主题不能被删除（removeTheme 静默忽略）', () => {
      // 不抛错即可
      expect(() => removeTheme('light')).not.toThrow();
      expect(getInstalledThemes().find(t => t.name === 'light')).toBeDefined();
    });

    it('重复安装应覆盖旧版本', () => {
      const theme: ExternalThemeConfig = JSON.parse(SAMPLE_THEME_JSON);
      installTheme(theme);
      const updated = { ...theme, version: '2.0.0' };
      installTheme(updated);
      const themes = getInstalledThemes();
      const found = themes.find(t => t.name === 'custom-ocean') as ExternalThemeConfig;
      expect(found.version).toBe('2.0.0');
    });
  });

  describe('isBuiltInTheme', () => {
    it('应正确识别内置主题名', () => {
      expect(isBuiltInTheme('light')).toBe(true);
      expect(isBuiltInTheme('dark')).toBe(true);
      expect(isBuiltInTheme('sepia')).toBe(true);
      expect(isBuiltInTheme('high-contrast')).toBe(true);
      expect(isBuiltInTheme('custom-ocean')).toBe(false);
    });
  });
});
