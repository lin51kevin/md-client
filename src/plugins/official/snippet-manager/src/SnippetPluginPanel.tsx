import type { PluginContext } from '../../../plugin-sandbox';

interface Snippet {
  id: string;
  name: string;
  content: string;
  description?: string;
  category?: string;
  createdAt: number;
}

interface SnippetForm {
  id: string;
  name: string;
  content: string;
  description: string;
  category: string;
  _isNew?: boolean;
}

function generateId(): string {
  return `snippet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function blankForm(): SnippetForm {
  return { id: '', name: '', content: '', description: '', category: '', _isNew: true };
}

function interpolate(text: string): string {
  return text
    .replace(/\b{{date}}\b/g, new Date().toLocaleDateString('zh-CN'))
    .replace(/\b{{time}}\b/g, new Date().toLocaleTimeString('zh-CN'))
    .replace(/\b{{datetime}}\b/g, new Date().toLocaleString('zh-CN'))
    .replace(/\b{{cursor}}\b/g, '▏');
}

export class SnippetPluginPanel {
  private context: PluginContext;
  private snippets: Snippet[] = [];
  private editingId: string | null = null;
  private editForm: SnippetForm = blankForm();
  private saveError: string | null = null;
  private categories: string[] = [];
  private selectedCategory: string = '';
  private _root: HTMLDivElement;

  constructor(context: PluginContext) {
    this.context = context;
    this._root = document.createElement('div');
    this._root.className = 'snippet-plugin-root';
    this.render();
    this.loadSnippets();
  }

  private async loadSnippets() {
    const raw = await this.context.storage.get('snippets');
    if (raw) {
      try {
        this.snippets = JSON.parse(raw);
        this.categories = [...new Set(
          this.snippets.map((s) => s.category).filter((c): c is string => !!c),
        )];
      } catch {
        this.snippets = [];
      }
    }
    this.render();
  }

  private async persist(updated: Snippet[]) {
    this.snippets = updated;
    this.categories = [...new Set(
      this.snippets.map((s) => s.category).filter((c): c is string => !!c),
    )];
    await this.context.storage.set('snippets', JSON.stringify(updated));
    this.saveError = null;
  }

  private startEdit(snippet?: Snippet) {
    if (snippet) {
      this.editForm = {
        ...snippet,
        description: snippet.description ?? '',
        category: snippet.category ?? '',
      };
      this.editingId = snippet.id;
    } else {
      this.editForm = blankForm();
      this.editingId = '__new__';
    }
    this.render();
  }

  private handleSave = async () => {
    if (!this.editForm.name.trim()) return;
    let updated: Snippet[];
    if (this.editForm._isNew || !this.editingId || this.editingId === '__new__') {
      const newSnippet: Snippet = {
        id: generateId(),
        name: this.editForm.name.trim(),
        content: this.editForm.content,
        description: this.editForm.description.trim(),
        category: this.editForm.category.trim(),
        createdAt: Date.now(),
      };
      updated = [...this.snippets, newSnippet];
    } else {
      updated = this.snippets.map((s) => {
        if (s.id !== this.editingId) return s;
        return {
          ...s,
          name: this.editForm.name.trim(),
          content: this.editForm.content,
          description: this.editForm.description.trim(),
          category: this.editForm.category.trim(),
        };
      });
    }
    await this.persist(updated);
    this.editingId = null;
    this.render();
  };

  private handleDelete = async (id: string) => {
    const updated = this.snippets.filter((s) => s.id !== id);
    await this.persist(updated);
    if (this.editingId === id) this.editingId = null;
    this.render();
  };

  private handleInsert = (snippet: Snippet) => {
    const text = interpolate(snippet.content);
    this.context.editor.insertText(text);
    this.context.ui.showMessage(`已插入：${snippet.name}`, 'info');
  };

  private handleRestoreDefaults = async () => {
    const defaults: Snippet[] = [
      {
        id: generateId(),
        name: '当前日期',
        content: '{{date}}',
        description: '插入当前日期',
        category: '变量',
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        name: '当前时间',
        content: '{{time}}',
        description: '插入当前时间',
        category: '变量',
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        name: '代码块',
        content: '```\n{{cursor}}\n```',
        description: 'Markdown 代码块',
        category: '模板',
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        name: '表格模板',
        content: '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| {{cursor}} |  |  |',
        description: 'Markdown 表格',
        category: '模板',
        createdAt: Date.now(),
      },
    ];
    await this.persist(defaults);
    this.selectedCategory = '';
    this.render();
  };

  private filteredSnippets(): Snippet[] {
    if (!this.selectedCategory) return this.snippets;
    return this.snippets.filter((s) => s.category === this.selectedCategory);
  }

  private setSelectedCategory(cat: string) {
    this.selectedCategory = cat;
    this.render();
  }

  private setEditFormField<K extends keyof SnippetForm>(key: K, value: SnippetForm[K]) {
    this.editForm = { ...this.editForm, [key]: value };
    this.render();
  }

  private render() {
    const filtered = this.filteredSnippets();
    const catBtns = ['', ...this.categories].map((cat) => ({ cat, label: cat || '全部' }));

    const root = this._root;
    root.innerHTML = '';
    root.className = 'snippet-plugin-root';

    if (this.saveError) {
      const err = document.createElement('div');
      err.className = 'snippet-plugin-error';
      err.innerHTML = `<span>⚠</span><span>${this.saveError}</span>`;
      root.appendChild(err);
    }

    const header = document.createElement('div');
    header.className = 'snippet-plugin-header';
    header.innerHTML = `<span class="snippet-plugin-title">Snippets</span>`;
    const addBtn = document.createElement('button');
    addBtn.className = 'snippet-plugin-btn snippet-plugin-btn-primary';
    addBtn.title = '新建片段';
    addBtn.innerHTML = '＋';
    addBtn.onclick = () => this.startEdit();
    header.appendChild(addBtn);
    root.appendChild(header);

    if (this.categories.length > 0) {
      const catRow = document.createElement('div');
      catRow.className = 'snippet-plugin-categories';
      catBtns.forEach(({ cat, label }) => {
        const btn = document.createElement('button');
        btn.className = `snippet-plugin-cat-btn${this.selectedCategory === cat ? ' active' : ''}`;
        btn.textContent = label;
        btn.onclick = () => this.setSelectedCategory(cat);
        catRow.appendChild(btn);
      });
      root.appendChild(catRow);
    }

    const list = document.createElement('div');
    list.className = 'snippet-plugin-list';
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'snippet-plugin-empty';
      empty.textContent = this.selectedCategory ? '该分类下暂无片段' : '暂无片段，点击 + 新建';
      list.appendChild(empty);
    } else {
      filtered.forEach((s) => {
        const item = document.createElement('div');
        item.className = `snippet-plugin-item${this.editingId === s.id ? ' editing' : ''}`;

        const info = document.createElement('div');
        info.className = 'snippet-plugin-item-info';
        const name = document.createElement('span');
        name.className = 'snippet-plugin-item-name';
        name.textContent = s.name;
        info.appendChild(name);
        if (s.description) {
          const desc = document.createElement('span');
          desc.className = 'snippet-plugin-item-desc';
          desc.textContent = s.description;
          info.appendChild(desc);
        }
        if (s.category) {
          const cat = document.createElement('span');
          cat.className = 'snippet-plugin-item-cat';
          cat.textContent = s.category;
          info.appendChild(cat);
        }
        item.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'snippet-plugin-item-actions';

        const insertBtn = document.createElement('button');
        insertBtn.className = 'snippet-plugin-btn';
        insertBtn.title = '插入';
        insertBtn.textContent = '▶';
        insertBtn.onclick = (e) => { e.stopPropagation(); this.handleInsert(s); };
        actions.appendChild(insertBtn);

        const editBtn = document.createElement('button');
        editBtn.className = 'snippet-plugin-btn';
        editBtn.title = '编辑';
        editBtn.textContent = '✎';
        editBtn.onclick = (e) => { e.stopPropagation(); this.startEdit(s); };
        actions.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'snippet-plugin-btn snippet-plugin-btn-danger';
        delBtn.title = '删除';
        delBtn.textContent = '✕';
        delBtn.onclick = (e) => { e.stopPropagation(); this.handleDelete(s.id); };
        actions.appendChild(delBtn);

        item.appendChild(actions);
        item.onclick = () => this.startEdit(s);
        list.appendChild(item);
      });
    }
    root.appendChild(list);

    const footer = document.createElement('div');
    footer.className = 'snippet-plugin-footer';
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'snippet-plugin-btn';
    restoreBtn.textContent = '恢复默认';
    restoreBtn.onclick = () => this.handleRestoreDefaults();
    footer.appendChild(restoreBtn);
    root.appendChild(footer);

    if (this.editingId) {
      const overlay = document.createElement('div');
      overlay.className = 'snippet-plugin-overlay';
      overlay.onclick = () => { this.editingId = null; this.render(); };

      const editor = document.createElement('div');
      editor.className = 'snippet-plugin-editor';
      editor.onclick = (e) => e.stopPropagation();

      const edHeader = document.createElement('div');
      edHeader.className = 'snippet-plugin-editor-header';
      edHeader.innerHTML = `<span>${this.editForm._isNew ? '新建片段' : '编辑片段'}</span>`;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'snippet-plugin-btn';
      closeBtn.textContent = '✕';
      closeBtn.onclick = () => { this.editingId = null; this.render(); };
      edHeader.appendChild(closeBtn);
      editor.appendChild(edHeader);

      const edBody = document.createElement('div');
      edBody.className = 'snippet-plugin-editor-body';

      const makeField = (label: string, placeholder: string, isTextarea: boolean, value: string, onChange: (v: string) => void) => {
        const wrap = document.createElement('div');
        wrap.className = 'snippet-plugin-field';
        const lbl = document.createElement('label');
        lbl.textContent = label;
        const inp = isTextarea ? document.createElement('textarea') : document.createElement('input');
        inp.className = isTextarea ? 'snippet-plugin-textarea' : 'snippet-plugin-input';
        inp.placeholder = placeholder;
        inp.value = value;
        inp.oninput = (e) => onChange((e.target as HTMLInputElement | HTMLTextAreaElement).value);
        if (isTextarea) (inp as HTMLTextAreaElement).rows = 8;
        wrap.appendChild(lbl);
        wrap.appendChild(inp);
        return wrap;
      };

      edBody.appendChild(makeField('名称', '片段名称', false, this.editForm.name, (v) => this.setEditFormField('name', v)));
      edBody.appendChild(makeField('描述', '片段描述（可选）', false, this.editForm.description, (v) => this.setEditFormField('description', v)));
      edBody.appendChild(makeField('分类', '片段分类（可选）', false, this.editForm.category, (v) => this.setEditFormField('category', v)));
      edBody.appendChild(makeField('内容', '支持 {{date}} {{time}} {{datetime}} {{cursor}}', true, this.editForm.content, (v) => this.setEditFormField('content', v)));

      const hint = document.createElement('div');
      hint.className = 'snippet-plugin-hint';
      hint.textContent = '占位符：{{date}} {{time}} {{datetime}} {{cursor}} — 插入时自动替换';
      edBody.appendChild(hint);

      editor.appendChild(edBody);

      const edFooter = document.createElement('div');
      edFooter.className = 'snippet-plugin-editor-footer';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'snippet-plugin-btn';
      cancelBtn.textContent = '取消';
      cancelBtn.onclick = () => { this.editingId = null; this.render(); };
      edFooter.appendChild(cancelBtn);
      const saveBtn = document.createElement('button');
      saveBtn.className = 'snippet-plugin-btn snippet-plugin-btn-primary';
      saveBtn.textContent = '保存';
      saveBtn.disabled = !this.editForm.name.trim();
      saveBtn.onclick = () => this.handleSave();
      edFooter.appendChild(saveBtn);
      editor.appendChild(edFooter);

      overlay.appendChild(editor);
      root.appendChild(overlay);
    }
  }
}
