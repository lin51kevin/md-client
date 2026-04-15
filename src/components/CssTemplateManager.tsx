import { useState, useCallback, useRef } from 'react';
import { Save, FolderInput, Download, Trash2, Check } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  getCssTemplates,
  saveCssTemplate,
  deleteCssTemplate,
  importCssTemplate,
  exportCssTemplate,
  type CSSTemplate,
} from '../lib/css-templates';
import { getCustomCss, setCustomCss, applyCustomCss } from '../lib/custom-css';

export function CssTemplateManager() {
  const { t } = useI18n();
  const [templates, setTemplates] = useState<CSSTemplate[]>(() => getCssTemplates());
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => setTemplates(getCssTemplates()), []);

  const handleSave = useCallback(() => {
    const name = saveName.trim();
    if (!name) return;
    const css = getCustomCss();
    if (!css.trim()) return;
    saveCssTemplate(name, css);
    setSaveName('');
    setShowSaveForm(false);
    refresh();
  }, [saveName, refresh]);

  const handleApply = useCallback((template: CSSTemplate) => {
    setCustomCss(template.css);
    applyCustomCss(template.css);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteCssTemplate(id);
    refresh();
  }, [refresh]);

  const handleExport = useCallback((template: CSSTemplate) => {
    const json = exportCssTemplate(template);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      importCssTemplate(text);
      refresh();
    } catch {
      // silently ignore invalid imports
    }
  }, [refresh]);

  return (
    <div className="space-y-2">
      {templates.length === 0 ? (
        <div
          className="text-xs px-3 py-2 rounded text-center"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
        >
          {t('settings.appearance.noTemplates')}
        </div>
      ) : (
        <div className="space-y-1">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className="flex items-center justify-between px-3 py-1.5 rounded text-xs group"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <span style={{ color: 'var(--text-primary)' }}>{tpl.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleApply(tpl)}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-color)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                  title={t('settings.appearance.applyTemplate')}
                >
                  <Check size={11} />
                </button>
                <button
                  onClick={() => handleExport(tpl)}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-color)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                  title={t('settings.appearance.exportTemplate')}
                >
                  <Download size={11} />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                  title={t('settings.appearance.deleteTemplate')}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSaveForm ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={t('settings.appearance.templateName')}
            className="flex-1 text-xs px-2 py-1 rounded outline-none"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveForm(false); }}
            autoFocus
          />
          <button
            onClick={handleSave}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }}
          >
            <Check size={11} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaveForm(true)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
            style={{
              backgroundColor: 'var(--accent-bg)',
              color: 'var(--accent-color)',
              border: '1px solid var(--accent-color)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-color)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-bg)'; e.currentTarget.style.color = 'var(--accent-color)'; }}
          >
            <Save size={11} />
            {t('settings.appearance.saveAsTemplate')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
          >
            <FolderInput size={11} />
            {t('settings.appearance.importTemplate')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      )}
    </div>
  );
}
