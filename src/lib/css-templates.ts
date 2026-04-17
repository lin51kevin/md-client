/**
 * css-templates — CSS 模板的 CRUD 与持久化
 */

import { StorageKeys } from './storage-keys';

export const CSS_TEMPLATES_KEY = StorageKeys.CSS_TEMPLATES;

export interface CSSTemplate {
  id: string;
  name: string;
  css: string;
  createdAt: number;
}

/** 读取所有已保存的 CSS 模板 */
export function getCssTemplates(): CSSTemplate[] {
  try {
    const raw = localStorage.getItem(CSS_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) as CSSTemplate[] : [];
  } catch {
    return [];
  }
}

/** 保存所有 CSS 模板 */
export function saveCssTemplates(templates: CSSTemplate[]): void {
  localStorage.setItem(CSS_TEMPLATES_KEY, JSON.stringify(templates));
}

/** 添加新模板 */
export function addCssTemplate(name: string, css: string): CSSTemplate {
  const templates = getCssTemplates();
  const template: CSSTemplate = {
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    css,
    createdAt: Date.now(),
  };
  templates.push(template);
  saveCssTemplates(templates);
  return template;
}

/** 删除模板 */
export function removeCssTemplate(id: string): void {
  const templates = getCssTemplates().filter(t => t.id !== id);
  saveCssTemplates(templates);
}

/** 更新模板 */
export { addCssTemplate as saveCssTemplate };
export { removeCssTemplate as deleteCssTemplate };

/** 更新模板 */
export function updateCssTemplate(id: string, updates: Partial<Pick<CSSTemplate, 'name' | 'css'>>): void {
  const templates = getCssTemplates().map(t =>
    t.id === id ? { ...t, ...updates } : t
  );
  saveCssTemplates(templates);
}

/** 从 JSON 文本导入模板 */
export function importCssTemplate(json: string): CSSTemplate {
  const parsed = JSON.parse(json);
  if (!parsed.name || typeof parsed.css !== 'string') {
    throw new Error('Invalid template format: expected { name: string, css: string }');
  }
  return addCssTemplate(parsed.name, parsed.css);
}

/** 导出模板为 JSON 字符串 */
export function exportCssTemplate(template: CSSTemplate): string {
  return JSON.stringify({ name: template.name, css: template.css }, null, 2);
}
