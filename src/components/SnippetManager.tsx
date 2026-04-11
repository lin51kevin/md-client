import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Snippet } from '../lib/snippets';
import {
  getSnippets,
  saveSnippets,
  generateSnippetId,
  getDefaultSnippets,
} from '../lib/snippets';

interface SnippetManagerProps {
  visible: boolean;
}

/** Blank snippet template for creating new */
function blankSnippet(): Snippet & { _isNew?: boolean } {
  return {
    id: '',
    name: '',
    content: '',
    description: '',
    createdAt: Date.now(),
    _isNew: true,
  };
}

export function SnippetManager({ visible }: SnippetManagerProps) {
  const { t } = useI18n();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Snippet & { _isNew?: boolean }>(blankSnippet());

  // Load snippets on mount
  useEffect(() => {
    if (visible) {
      setSnippets(getSnippets());
      setEditingId(null);
    }
  }, [visible]);

  const persist = useCallback((updated: Snippet[]) => {
    saveSnippets(updated);
    setSnippets([...updated]);
  }, []);

  /** Start editing a snippet (or creating new) */
  const startEdit = useCallback((s?: Snippet) => {
    if (s) {
      setEditForm({ ...s });
      setEditingId(s.id);
    } else {
      setEditForm(blankSnippet());
      setEditingId('__new__');
    }
  }, []);

  /** Save current edit form */
  const handleSave = useCallback(() => {
    if (!editForm.name.trim()) return;

    let updated: Snippet[];
    if (editForm._isNew || !editingId || editingId === '__new__') {
      const newSnippet: Snippet = {
        ...editForm,
        id: generateSnippetId(),
        createdAt: Date.now(),
      };
      delete (newSnippet as any)._isNew;
      updated = [...snippets, newSnippet];
    } else {
      updated = snippets.map((s) =>
        s.id === editingId ? { ...editForm, _isNew: undefined as unknown as undefined } : s,
      );
    }
    persist(updated);
    setEditingId(null);
  }, [editForm, editingId, snippets, persist]);

  /** Delete a snippet */
  const handleDelete = useCallback(
    (id: string) => {
      persist(snippets.filter((s) => s.id !== id));
      if (editingId === id) setEditingId(null);
    },
    [snippets, persist, editingId],
  );

  /** Restore defaults */
  const handleRestoreDefaults = useCallback(() => {
    const defs = getDefaultSnippets();
    persist(defs);
    setEditingId(null);
  }, [persist]);

  if (!visible) return null;

  return (
    <div className="snippet-manager">
      <div className="snippet-manager-header">
        <span className="snippet-manager-title">{t('snippet.manager')}</span>
        <button
          className="snippet-manager-btn snippet-manager-btn-primary"
          onClick={() => startEdit()}
          title={t('snippet.newSnippet')}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Snippet list */}
      <div className="snippet-manager-list">
        {snippets.map((s) => (
          <div
            key={s.id}
            className={`snippet-manager-item ${editingId === s.id ? 'snippet-manager-item-editing' : ''}`}
            onClick={() => startEdit(s)}
          >
            <div className="snippet-manager-item-info">
              <span className="snippet-manager-item-name">{s.name || t('snippet.defaultName')}</span>
              {s.description && (
                <span className="snippet-manager-item-desc">{s.description}</span>
              )}
            </div>
            <button
              className="snippet-manager-btn snippet-manager-btn-danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(s.id);
              }}
              title={t('common.delete')}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {snippets.length === 0 && (
          <div className="snippet-empty" style={{ color: 'var(--text-secondary)' }}>
            {t('snippet.noResults')}
          </div>
        )}
      </div>

      {/* Restore defaults */}
      <div className="snippet-manager-footer">
        <button
          className="snippet-manager-btn-text"
          onClick={handleRestoreDefaults}
        >
          {t('snippet.restoreDefaults')}
        </button>
      </div>

      {/* Edit form (inline or modal-style) */}
      {editingId && (
        <div className="snippet-editor-overlay" onClick={() => setEditingId(null)}>
          <div className="snippet-editor" onClick={(e) => e.stopPropagation()}>
            <div className="snippet-editor-header">
              <span>{editForm._isNew ? t('snippet.newSnippet') : t('snippet.editSnippet')}</span>
              <button onClick={() => setEditingId(null)}>
                <X size={14} />
              </button>
            </div>

            <div className="snippet-editor-body">
              <label className="snippet-editor-label">{t('snippet.fieldName')}</label>
              <input
                className="snippet-editor-input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('snippet.defaultName')}
                autoFocus={editForm._isNew}
              />

              <label className="snippet-editor-label">{t('snippet.fieldDesc')}</label>
              <input
                className="snippet-editor-input"
                value={editForm.description ?? ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder={t('snippet.fieldDescPlaceholder')}
              />

              <label className="snippet-editor-label">{t('snippet.fieldContent')}</label>
              <textarea
                className="snippet-editor-textarea"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={10}
                spellCheck={false}
              />

              <div className="snippet-editor-hint" style={{ color: 'var(--text-tertiary)' }}>
                ${'{'}variable${'}'} · ${'{'}cursor${'}'} · ${'{'}date${'}'} · ${'{'}title|默认值${'}'}
              </div>
            </div>

            <div className="snippet-editor-footer">
              <button
                className="snippet-manager-btn snippet-manager-btn-text"
                onClick={() => setEditingId(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="snippet-manager-btn snippet-manager-btn-primary"
                onClick={handleSave}
                disabled={!editForm.name.trim()}
              >
                <Save size={13} /> {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
