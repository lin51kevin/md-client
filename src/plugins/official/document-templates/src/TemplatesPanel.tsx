import { createElement, useState, useCallback, useEffect } from 'react';
import type { PluginContext } from '../../../plugin-sandbox';
import type { Template } from './index';
import {
  getAllTemplates,
  createTemplate,
  deleteTemplate,
  updateTemplate,
  applyTemplate,
  getTemplateVars,
} from './index';

type Tab = 'list' | 'edit';

export class TemplatesPanelContent {
  // Public for TemplateEditor access
  context: PluginContext;
  private listeners: Set<() => void> = new Set();
  private state: {
    templates: Template[];
    selectedId: string | null;
    tab: Tab;
    editName: string;
    editContent: string;
    editId: string | null; // null = new, string = editing existing
  };

  constructor(context: PluginContext) {
    this.context = context;
    this.state = {
      templates: [],
      selectedId: null,
      tab: 'list',
      editName: '',
      editContent: '',
      editId: null,
    };
    this.refresh();
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private setState(partial: Partial<typeof this.state>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  async refresh() {
    const templates = await getAllTemplates(this.context.storage);
    this.setState({ templates });
  }

  /** Called by the command palette — show a quick picker via modal. */
  handleNewFromTemplate() {
    const allTemplates = this.state.templates;
    if (allTemplates.length === 0) {
      this.context.ui.showMessage('没有可用的模板', 'warning');
      return;
    }

    // If only one template, use it directly
    if (allTemplates.length === 1) {
      this.applyAndCreate(allTemplates[0]);
      return;
    }

    // Show confirmation for the first (default) template
    const listHtml = allTemplates
      .map((t, i) => `${i + 1}. ${t.name}${t.builtIn ? ' (内置)' : ''}`)
      .join('\n');

    this.context.ui
      .showModal({
        title: '从模板新建 (New from Template)',
        content: listHtml + '\n\n是否使用第一个模板创建？\n（更多选项请使用侧边栏面板）',
        type: 'confirm',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.applyAndCreate(allTemplates[0]);
        }
      });
  }

  /** Create a new document from a template. */
  private applyAndCreate(template: Template) {
    const active = this.context.workspace.getActiveFile();
    const filename = active.name || 'untitled';
    const vars = getTemplateVars(filename);
    let content = applyTemplate(template.content, vars);

    const cursorPos = content.indexOf('\x00');
    if (cursorPos >= 0) {
      content = content.replace('\x00', '');
    }

    this.context.workspace.createNewDoc(content);
  }

  // ── Panel render (React element factory) ────────────────────────────────

  render() {
    return createElement(TemplatesPanel, {
      panel: this,
    });
  }

  // ── Public API for the React component ───────────────────────────────────

  get templates() {
    return this.state.templates;
  }

  get tab() {
    return this.state.tab;
  }

  get selectedId() {
    return this.state.selectedId;
  }

  get editName() {
    return this.state.editName;
  }

  get editContent() {
    return this.state.editContent;
  }

  get editId() {
    return this.state.editId;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  selectTemplate(id: string | null) {
    this.setState({ selectedId: id });
  }

  startNew() {
    this.setState({
      tab: 'edit',
      editId: null,
      editName: '',
      editContent: '',
    });
  }

  startEdit(id: string) {
    const tmpl = this.state.templates.find((t) => t.id === id);
    if (tmpl) {
      this.setState({
        tab: 'edit',
        editId: id,
        editName: tmpl.name,
        editContent: tmpl.content,
      });
    }
  }

  async saveTemplate(name: string, content: string) {
    if (this.state.editId) {
      await updateTemplate(this.context.storage, this.state.editId, { name, content });
    } else {
      await createTemplate(this.context.storage, { name, content });
    }
    await this.refresh();
    this.setState({ tab: 'list' });
  }

  async removeTemplate(id: string) {
    await deleteTemplate(this.context.storage, id);
    await this.refresh();
    this.setState({ selectedId: null });
  }

  cancelEdit() {
    this.setState({ tab: 'list' });
  }

  createFromTemplate(id: string) {
    const tmpl = this.state.templates.find((t) => t.id === id);
    if (tmpl) {
      this.applyAndCreate(tmpl);
    }
  }
}

// ── React Component ─────────────────────────────────────────────────────────

interface TemplatesPanelProps {
  panel: TemplatesPanelContent;
}

function TemplatesPanel({ panel }: TemplatesPanelProps) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return panel.subscribe(() => forceUpdate((n) => n + 1));
  }, [panel]);

  const tab = panel.tab;

  if (tab === 'edit') {
    return createElement(TemplateEditor, { panel });
  }

  return createElement(TemplateList, { panel });
}

function TemplateList({ panel }: TemplatesPanelProps) {
  const templates = panel.templates;
  const selectedId = panel.selectedId;

  return createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', fontSize: '13px' } },
    createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border-color, #e0e0e0)' } },
      createElement('span', { style: { fontWeight: 600 } }, '📄 文档模板'),
      createElement('button', {
        onClick: () => panel.startNew(),
        style: { background: 'none', border: '1px solid var(--border-color, #ccc)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 },
      }, '+ 新建'),
    ),
    createElement('div', { style: { flex: 1, overflow: 'auto', padding: '4px 0' } },
      templates.length === 0
        ? createElement('div', { style: { padding: 16, color: '#999', textAlign: 'center' } }, '暂无模板')
        : templates.map((t) =>
            createElement('div', {
              key: t.id,
              onClick: () => panel.selectTemplate(t.id === selectedId ? null : t.id),
              style: {
                padding: '8px 12px',
                cursor: 'pointer',
                background: t.id === selectedId ? 'var(--accent-bg, #f0f6ff)' : 'transparent',
                borderBottom: '1px solid var(--border-color, #f0f0f0)',
              },
            }, t.name),
          ),
    ),
    selectedId && createElement(TemplateActions, { panel, id: selectedId }),
  );
}

function TemplateActions({ panel, id }: { panel: TemplatesPanelContent; id: string }) {
  const tmpl = panel.templates.find((t) => t.id === id);
  if (!tmpl) return null;

  return createElement('div', { style: { borderTop: '1px solid var(--border-color, #e0e0e0)', padding: '12px' } },
    createElement('div', { style: { fontWeight: 500, marginBottom: 6 } }, tmpl.name),
    createElement('pre', {
      style: { fontSize: 11, background: 'var(--code-bg, #f5f5f5)', padding: 8, borderRadius: 4, maxHeight: 120, overflow: 'auto', marginBottom: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
    }, tmpl.content.slice(0, 500) + (tmpl.content.length > 500 ? '\n...' : '')),
    createElement('div', { style: { display: 'flex', gap: 6 } },
      createElement('button', {
        onClick: () => panel.createFromTemplate(id),
        style: { flex: 1, padding: '4px 8px', background: 'var(--accent, #4a90d9)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
      }, '📄 使用模板'),
      !tmpl.builtIn && createElement('button', {
        onClick: () => panel.startEdit(id),
        style: { padding: '4px 8px', border: '1px solid var(--border-color, #ccc)', borderRadius: 4, cursor: 'pointer', background: 'none' },
      }, '✏️'),
      !tmpl.builtIn && createElement('button', {
        onClick: () => panel.removeTemplate(id),
        style: { padding: '4px 8px', border: '1px solid #e88', borderRadius: 4, cursor: 'pointer', background: 'none', color: '#c44' },
      }, '🗑️'),
    ),
  );
}

function TemplateEditor({ panel }: TemplatesPanelProps) {
  const [name, setName] = useState(panel.editName);
  const [content, setContent] = useState(panel.editContent);
  const isNew = panel.editId === null;

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    void panel.saveTemplate(trimmed, content);
  }, [name, content, panel]);

  return createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', fontSize: 13, padding: 8 } },
    createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
      createElement('span', { style: { fontWeight: 600 } }, isNew ? '新建模板' : '编辑模板'),
      createElement('button', {
        onClick: () => panel.cancelEdit(),
        style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 },
      }, '✕'),
    ),
    createElement('input', {
      type: 'text',
      placeholder: '模板名称',
      value: name,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      style: { width: '100%', padding: '4px 8px', marginBottom: 8, border: '1px solid var(--border-color, #ccc)', borderRadius: 4, boxSizing: 'border-box' },
    }),
    createElement('textarea', {
      placeholder: '模板内容（支持 ${date}, ${time}, ${filename}, ${cursor} 变量）',
      value: content,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value),
      style: { flex: 1, width: '100%', padding: '4px 8px', border: '1px solid var(--border-color, #ccc)', borderRadius: 4, resize: 'none', fontFamily: 'monospace', fontSize: 12, boxSizing: 'border-box' as const },
    }),
    createElement('div', { style: { marginTop: 8, fontSize: 11, color: '#888' } }, '变量: ${date} ${time} ${filename} ${cursor}'),
    createElement('div', { style: { marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' } },
      createElement('button', {
        onClick: () => panel.cancelEdit(),
        style: { padding: '4px 12px', border: '1px solid var(--border-color, #ccc)', borderRadius: 4, cursor: 'pointer', background: 'none' },
      }, '取消'),
      createElement('button', {
        onClick: handleSave,
        style: { padding: '4px 12px', background: 'var(--accent, #4a90d9)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
      }, '保存'),
    ),
  );
}
