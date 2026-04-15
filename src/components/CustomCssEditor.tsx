import { useState, useCallback, useRef } from 'react';
import { Save, Download, FolderInput, Trash2, ChevronDown } from 'lucide-react';
import { useI18n } from '../i18n';
import { getCustomCss, setCustomCss, clearCustomCss, applyCustomCss, removeCustomCssStyle } from '../lib/custom-css';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import {
  getCssTemplates,
  saveCssTemplate,
  deleteCssTemplate,
  importCssTemplate,
  exportCssTemplate,
  type CSSTemplate,
} from '../lib/css-templates';

export function CustomCssEditor() {
  const { t } = useI18n();
  const [css, setCss] = useState(() => getCustomCss());
  const [templates, setTemplates] = useState<CSSTemplate[]>(() => getCssTemplates());
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => setTemplates(getCssTemplates()), []);

  const handleApply = useCallback(() => {
    setCustomCss(css);
    applyCustomCss(css);
  }, [css]);

  const handleClear = useCallback(() => {
    setCss('');
    clearCustomCss();
    removeCustomCssStyle();
  }, []);

  const handleLoadTemplate = useCallback((tpl: CSSTemplate) => {
    setCss(tpl.css);
    setCustomCss(tpl.css);
    applyCustomCss(tpl.css);
    setShowDropdown(false);
  }, []);

  const handleSaveTemplate = useCallback(() => {
    const name = saveName.trim();
    if (!name || !css.trim()) return;
    saveCssTemplate(name, css);
    setSaveName('');
    setShowSaveInput(false);
    refresh();
  }, [saveName, css, refresh]);

  const handleDeleteTemplate = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCssTemplate(id);
    refresh();
  }, [refresh]);

  const handleExportTemplate = useCallback(async (e: React.MouseEvent, tpl: CSSTemplate) => {
    e.stopPropagation();
    const json = exportCssTemplate(tpl);
    try {
      const savePath = await save({
        defaultPath: `${tpl.name}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (savePath) {
        await invoke('write_file_text', { path: savePath, content: json });
      }
    } catch {
      // user cancelled
    }
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
      {/* Template bar: dropdown + save button */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="flex items-center justify-between w-full text-xs px-2 py-1 rounded transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>{t('settings.appearance.cssPresets')}</span>
            <ChevronDown size={11} style={{ transform: showDropdown ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
          </button>

          {showDropdown && (
            <div
              className="absolute left-0 right-0 mt-1 rounded shadow-lg overflow-hidden z-50"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {templates.length === 0 ? (
                <div className="text-[10px] px-3 py-2 text-center" style={{ color: 'var(--text-tertiary)' }}>
                  {t('settings.appearance.noTemplates')}
                </div>
              ) : (
                <div className="max-h-32 overflow-y-auto">
                  {templates.map(tpl => (
                    <div
                      key={tpl.id}
                      className="flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      onClick={() => handleLoadTemplate(tpl)}
                    >
                      <span className="truncate mr-2">{tpl.name}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={(e) => handleExportTemplate(e, tpl)}
                          className="p-0.5 rounded transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-color)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                          title={t('settings.appearance.exportTemplate')}
                        >
                          <Download size={10} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteTemplate(e, tpl.id)}
                          className="p-0.5 rounded transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                          title={t('settings.appearance.deleteTemplate')}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Import action at bottom of dropdown */}
              <div
                className="flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer transition-colors"
                style={{
                  borderTop: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                onClick={() => { fileInputRef.current?.click(); setShowDropdown(false); }}
              >
                <FolderInput size={10} />
                {t('settings.appearance.importTemplate')}
              </div>
            </div>
          )}
        </div>

        {/* Save current CSS as template */}
        {showSaveInput ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t('settings.appearance.templateName')}
              className="text-xs px-2 py-1 rounded outline-none w-24"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTemplate();
                if (e.key === 'Escape') { setShowSaveInput(false); setSaveName(''); }
              }}
              autoFocus
            />
            <button
              onClick={handleSaveTemplate}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--accent-color)' }}
              title={t('settings.appearance.saveAsTemplate')}
            >
              <Save size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveInput(true)}
            className="p-1 rounded transition-colors shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-color)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            title={t('settings.appearance.saveAsTemplate')}
          >
            <Save size={13} />
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* CSS textarea */}
      <textarea
        value={css}
        onChange={(e) => setCss(e.target.value)}
        placeholder={`.markdown-preview {\n  font-family: Georgia, serif;\n  font-size: 16px;\n}`}
        rows={6}
        spellCheck={false}
        className="w-full text-xs rounded p-2 outline-none resize-y font-mono leading-relaxed"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          minHeight: 96,
        }}
      />

      <div className="flex gap-2 justify-end">
        <button
          onClick={handleClear}
          className="text-xs px-3 py-1 rounded transition-colors"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
        >
          {t('settings.appearance.clearCss')}
        </button>
        <button
          onClick={handleApply}
          className="text-xs px-3 py-1 rounded transition-colors"
          style={{
            backgroundColor: 'var(--accent-bg)',
            border: '1px solid var(--accent-color)',
            color: 'var(--accent-color)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-color)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-bg)'; e.currentTarget.style.color = 'var(--accent-color)'; }}
        >
          {t('settings.appearance.applyCss')}
        </button>
      </div>
    </div>
  );
}
