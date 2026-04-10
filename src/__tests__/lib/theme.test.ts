import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { THEMES, applyTheme, getSavedTheme, saveTheme, type ThemeName } from '../../lib/theme';

describe('F011 — 主题系统', () => {

  beforeEach(() => {
    // 清除 CSS 变量和 localStorage
    document.documentElement.style.cssText = '';
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.style.cssText = '';
    localStorage.removeItem('marklite-theme');
  });

  describe('THEMES 注册表', () => {
    it('应包含四种内置主题', () => {
      expect(Object.keys(THEMES)).toEqual(['light', 'dark', 'sepia', 'high-contrast']);
    });

    it('每种主题应包含完整的 CSS 变量集', () => {
      const expectedVars = ['--bg-primary', '--bg-secondary', '--bg-tertiary',
        '--text-primary', '--text-secondary', '--border-color', '--accent-color', '--accent-hover'];
      (Object.keys(THEMES) as ThemeName[]).forEach(name => {
        expectedVars.forEach(v => {
          expect(THEMES[name].cssVars[v]).toBeDefined();
        });
      });
    });

    it('dark 主题 isDark 应为 true', () => {
      expect(THEMES.dark.isDark).toBe(true);
      expect(THEMES.light.isDark).toBe(false);
    });
  });

  describe('applyTheme', () => {
    it('应注入 CSS 变量到 :root', () => {
      applyTheme('dark');
      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#0d1117');
      expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe('#f0f6fc');
    });

    it('切换主题应覆盖之前的变量', () => {
      applyTheme('light');
      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#ffffff');
      applyTheme('dark');
      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#0d1117');
    });

    it('应设置 color-scheme', () => {
      applyTheme('dark');
      expect(document.documentElement.style.colorScheme).toBe('dark');
      applyTheme('light');
      expect(document.documentElement.style.colorScheme).toBe('light');
    });
  });

  describe('saveTheme / getSavedTheme', () => {
    it('保存后读取应返回相同值', () => {
      saveTheme('dark');
      expect(getSavedTheme()).toBe('dark');
    });

    it('未保存时应返回 null', () => {
      expect(getSavedTheme()).toBeNull();
    });

    it('覆盖保存应以最新值为准', () => {
      saveTheme('light');
      saveTheme('dark');
      expect(getSavedTheme()).toBe('dark');
    });

    it('非法值不应被接受', () => {
      localStorage.setItem('marklite-theme', 'invalid');
      expect(getSavedTheme()).toBeNull();
    });
  });
});
