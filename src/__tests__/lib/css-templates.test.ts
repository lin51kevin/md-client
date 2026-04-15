import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCssTemplates,
  saveCssTemplate,
  deleteCssTemplate,
  importCssTemplate,
  exportCssTemplate,
} from '../../lib/css-templates';

beforeEach(() => {
  localStorage.clear();
});

describe('css-templates', () => {
  it('should start with empty templates', () => {
    expect(getCssTemplates()).toEqual([]);
  });

  it('should save a template', () => {
    const tpl = saveCssTemplate('test', 'body { color: red; }');
    expect(tpl.name).toBe('test');
    expect(tpl.css).toBe('body { color: red; }');
    expect(tpl.id).toBeTruthy();
    expect(tpl.createdAt).toBeGreaterThan(0);
  });

  it('should list saved templates', () => {
    saveCssTemplate('a', '.a{}');
    saveCssTemplate('b', '.b{}');
    const list = getCssTemplates();
    expect(list).toHaveLength(2);
    expect(list.map(t => t.name)).toEqual(['a', 'b']);
  });

  it('should delete a template', () => {
    const tpl = saveCssTemplate('del', '.del{}');
    expect(getCssTemplates()).toHaveLength(1);
    deleteCssTemplate(tpl.id);
    expect(getCssTemplates()).toHaveLength(0);
  });

  it('should export and import a template', () => {
    saveCssTemplate('orig', '.orig{}');
    const json = exportCssTemplate(getCssTemplates()[0]);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('orig');
    expect(parsed.css).toBe('.orig{}');
    // clear and reimport
    localStorage.clear();
    expect(getCssTemplates()).toHaveLength(0);
    importCssTemplate(json);
    const imported = getCssTemplates();
    expect(imported).toHaveLength(1);
    expect(imported[0].name).toBe('orig');
    expect(imported[0].css).toBe('.orig{}');
  });

  it('should throw on invalid import', () => {
    expect(() => importCssTemplate('invalid')).toThrow();
    expect(() => importCssTemplate('{}')).toThrow();
  });
});
