import { describe, it, expect, vi } from 'vitest';
import {
  applyTemplate,
  getTemplateVars,
  loadUserTemplates,
  saveUserTemplates,
  createTemplate,
  deleteTemplate,
  getAllTemplates,
  DEFAULT_TEMPLATES,
} from '../../../../plugins/official/document-templates/src/index';

// ── Mock storage ───────────────────────────────────────────────────────────

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
  };
}

// ── applyTemplate ──────────────────────────────────────────────────────────

describe('applyTemplate', () => {
  it('replaces all known variables', () => {
    const result = applyTemplate(
      'Date: ${date} Time: ${time} File: ${filename}',
      { date: '2026-05-03', time: '12:00', filename: 'test', cursor: '' },
    );
    expect(result).toBe('Date: 2026-05-03 Time: 12:00 File: test');
  });

  it('leaves unknown variables as-is', () => {
    const result = applyTemplate('Hello ${unknown}', { date: '2026-05-03', time: '12:00', filename: 'test', cursor: '' });
    expect(result).toBe('Hello ${unknown}');
  });

  it('replaces cursor with empty string', () => {
    const result = applyTemplate('before${cursor}after', { date: '', time: '', filename: '', cursor: '' });
    expect(result).toBe('beforeafter');
  });

  it('handles template with no variables', () => {
    const result = applyTemplate('plain text', {});
    expect(result).toBe('plain text');
  });

  it('handles empty template', () => {
    const result = applyTemplate('', { date: '2026-05-03', time: '12:00', filename: 'test', cursor: '' });
    expect(result).toBe('');
  });
});

// ── getTemplateVars ────────────────────────────────────────────────────────

describe('getTemplateVars', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const vars = getTemplateVars('test');
    expect(vars.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns time in HH:MM format', () => {
    const vars = getTemplateVars('test');
    expect(vars.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('uses provided filename', () => {
    const vars = getTemplateVars('my-doc');
    expect(vars.filename).toBe('my-doc');
  });

  it('defaults filename to "untitled"', () => {
    const vars = getTemplateVars('');
    expect(vars.filename).toBe('untitled');
  });
});

// ── Default templates ──────────────────────────────────────────────────────

describe('DEFAULT_TEMPLATES', () => {
  it('has exactly 3 built-in templates', () => {
    expect(DEFAULT_TEMPLATES).toHaveLength(3);
  });

  it('all built-in templates are marked as builtIn', () => {
    DEFAULT_TEMPLATES.forEach((t) => {
      expect(t.builtIn).toBe(true);
    });
  });

  it('contains meeting-notes, tech-doc, and diary', () => {
    const ids = DEFAULT_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('meeting-notes');
    expect(ids).toContain('tech-doc');
    expect(ids).toContain('diary');
  });

  it('templates contain variable placeholders', () => {
    DEFAULT_TEMPLATES.forEach((t) => {
      expect(t.content).toMatch(/\$\{\w+\}/);
    });
  });

  it('templates contain cursor placeholder', () => {
    DEFAULT_TEMPLATES.forEach((t) => {
      expect(t.content).toContain('${cursor}');
    });
  });
});

// ── CRUD operations ────────────────────────────────────────────────────────

describe('template CRUD', () => {
  it('loadUserTemplates returns empty for no data', async () => {
    const storage = createMockStorage();
    const result = await loadUserTemplates(storage);
    expect(result).toEqual([]);
  });

  it('createTemplate adds a template', async () => {
    const storage = createMockStorage();
    const tmpl = await createTemplate(storage, { name: 'Test', content: 'Hello ${date}' });
    expect(tmpl.id).toMatch(/^user-\d+$/);
    expect(tmpl.name).toBe('Test');
    expect(tmpl.builtIn).toBeUndefined();
  });

  it('deleteTemplate removes a user template', async () => {
    const storage = createMockStorage();
    const tmpl = await createTemplate(storage, { name: 'ToDelete', content: 'x' });
    await deleteTemplate(storage, tmpl.id);
    const list = await loadUserTemplates(storage);
    expect(list).toHaveLength(0);
  });

  it('getAllTemplates returns built-in + user templates', async () => {
    const storage = createMockStorage();
    await createTemplate(storage, { name: 'Custom', content: 'custom' });
    const all = await getAllTemplates(storage);
    expect(all).toHaveLength(DEFAULT_TEMPLATES.length + 1);
  });
});
