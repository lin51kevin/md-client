import { describe, it, expect, beforeEach } from 'vitest';
import {
  CUSTOM_CSS_KEY,
  getCustomCss,
  setCustomCss,
  clearCustomCss,
} from '../../../lib/ui';

describe('custom-css', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getCustomCss 无数据时应返回空字符串', () => {
    expect(getCustomCss()).toBe('');
  });

  it('setCustomCss 应保存 CSS 到 localStorage', () => {
    setCustomCss('.foo { color: red; }');
    expect(localStorage.getItem(CUSTOM_CSS_KEY)).toBe('.foo { color: red; }');
  });

  it('getCustomCss 应返回已保存的 CSS', () => {
    setCustomCss('.bar { font-size: 16px; }');
    expect(getCustomCss()).toBe('.bar { font-size: 16px; }');
  });

  it('clearCustomCss 应清除已保存的 CSS', () => {
    setCustomCss('body { margin: 0; }');
    clearCustomCss();
    expect(getCustomCss()).toBe('');
    expect(localStorage.getItem(CUSTOM_CSS_KEY)).toBeNull();
  });

  it('setCustomCss 传入空字符串应能正常存储', () => {
    setCustomCss('');
    expect(getCustomCss()).toBe('');
  });

  it('多次调用 setCustomCss 应覆盖旧值', () => {
    setCustomCss('body { color: red; }');
    setCustomCss('body { color: blue; }');
    expect(getCustomCss()).toBe('body { color: blue; }');
  });
});
