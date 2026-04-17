/**
 * custom-css — 用户自定义 CSS 的读写与注入
 */

import { StorageKeys } from './storage-keys';

export const CUSTOM_CSS_KEY = StorageKeys.CUSTOM_CSS;
const STYLE_TAG_ID = 'marklite-custom-css-style';

/** 读取已保存的自定义 CSS，无数据时返回空字符串 */
export function getCustomCss(): string {
  return localStorage.getItem(CUSTOM_CSS_KEY) ?? '';
}

/** 保存自定义 CSS 到 localStorage */
export function setCustomCss(css: string): void {
  localStorage.setItem(CUSTOM_CSS_KEY, css);
}

/** 清除已保存的自定义 CSS */
export function clearCustomCss(): void {
  localStorage.removeItem(CUSTOM_CSS_KEY);
}

/** 将 CSS 字符串注入 <head> 中的 style 标签（实时预览） */
export function applyCustomCss(css: string): void {
  let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_TAG_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

/** 移除已注入的 style 标签 */
export function removeCustomCssStyle(): void {
  const el = document.getElementById(STYLE_TAG_ID);
  if (el) el.remove();
}
