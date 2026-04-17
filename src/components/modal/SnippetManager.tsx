import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, RotateCcw } from 'lucide-react';
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
  onClose?: () => void;
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

export function SnippetManager({ visible, onClose }: SnippetManagerProps) {
  const { t } = useI18n();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Snippet & { _isNew?: boolean }>(blankSnippet());
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load snippets on mount
  useEffect(() => {
    if (visible) {
      setSnippets(getSnippets());
      setEditingId(null);
    }
  }, [visible]);

  const persist = useCallback((updated: Snippet[]) => {
    const ok = saveSnippets(updated);
    setSnippets([...updated]);
    if (!ok) {
      setSaveError(t('snippet.saveFailed'));
    } else {
      setSaveError(null);
    }
  }, [t]);

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
      const { _isNew: _, ...snippetData } = { ...editForm, id: generateSnippetId(), createdAt: Date.now() };
      const newSnippet: Snippet = snippetData;
      updated = [...snippets, newSnippet];
    } else {
      updated = snippets.map((s) => {
        if (s.id !== editingId) return s;
        const { _isNew: _, ...snippetData } = editForm;
        return snippetData;
      });
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

  const content = (
    <div className="snippet-manager">
      {saveError && (
        <div className="snippet-manager-error" role="alert">
          <AlertCircle size={13} />
          <span>{saveError}</span>
        </div>
      )}
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
          className="snippet-manager-btn snippet-manager-btn-danger"
          onClick={handleRestoreDefaults}
        >
          <RotateCcw size={12} />
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

  // If onClose is provided, render with own modal wrapper
  if (onClose) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-[10001]"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      >
        <div className="snippet-manager-modal" onClick={(e) => e.stopPropagation()}>
          <div className="snippet-manager-header">
            <span>{t('snippet.manager')}</span>
            <button onClick={onClose}><X size={14} /></button>
          </div>
          <div className="snippet-manager-body">{content}</div>
        </div>
      </div>
    );
  }

  return content;
}
