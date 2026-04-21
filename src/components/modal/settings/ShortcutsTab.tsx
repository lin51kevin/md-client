import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useI18n } from '../../../i18n';
import {
  DEFAULT_SHORTCUTS,
  getCustomShortcuts,
  setCustomShortcuts,
  formatKeyEvent,
  detectConflict,
  type ShortcutCategory,
} from '../../../lib/editor';

/** 增强版可编辑快捷键列表：搜索 + 分类筛选 + 冲突检测 */
function EditableShortcuts() {
  const { t } = useI18n();
  const [custom, setCustom] = useState<Record<string, string>>(() => getCustomShortcuts());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempKeys, setTempKeys] = useState<string>('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ShortcutCategory | 'all'>('all');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setEditingId(null); setTempKeys(''); setConflictWarning(null);
        return;
      }
      const formatted = formatKeyEvent(e);
      if (formatted) {
        setTempKeys(formatted);
        const conflictId = detectConflict(formatted, editingId);
        setConflictWarning(conflictId);
        if (!conflictId) {
          setEditingId(null);
          const newCustom = { ...custom, [editingId]: formatted };
          setCustom(newCustom);
          setCustomShortcuts(newCustom);
          setTempKeys('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingId, custom]);

  const resetToDefault = useCallback((id: string) => {
    const newCustom = { ...custom };
    delete newCustom[id];
    setCustom(newCustom);
    setCustomShortcuts(newCustom);
  }, [custom]);

  const filtered = DEFAULT_SHORTCUTS.filter((sc) => {
    const matchCat = category === 'all' || sc.category === category;
    const label = t(sc.labelKey);
    const matchSearch = !search || label.toLowerCase().includes(search.toLowerCase()) ||
      (custom[sc.id] || sc.defaultKeys).toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const CATEGORIES: { id: ShortcutCategory | 'all'; labelKey: string }[] = [
    { id: 'all', labelKey: 'settings.shortcuts.allCategories' },
    { id: 'file', labelKey: 'settings.shortcuts.category.file' },
    { id: 'edit', labelKey: 'settings.shortcuts.category.edit' },
    { id: 'view', labelKey: 'settings.shortcuts.category.view' },
    { id: 'ai', labelKey: 'settings.shortcuts.category.ai' },
  ];

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('settings.shortcuts.searchPlaceholder')}
          className="flex-1 min-w-0 text-xs px-2 py-1 rounded outline-none"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={() => { setCustom({}); setCustomShortcuts({}); }}
          className="px-2 py-0.5 rounded text-[10px] transition-colors hover:opacity-80"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <span className="inline-flex items-center gap-1">
            <RotateCcw size={10} />
            {t('settings.shortcuts.resetAll')}
          </span>
        </button>
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className="px-2 py-0.5 rounded text-[10px] transition-colors"
              style={{
                backgroundColor: category === cat.id ? 'var(--accent-bg)' : 'transparent',
                color: category === cat.id ? 'var(--accent-color)' : 'var(--text-tertiary)',
                border: category === cat.id ? '1px solid var(--accent-color)' : '1px solid transparent',
              }}
            >
              {cat.id === 'all' ? t('settings.shortcuts.allCategories') : t(`settings.shortcuts.category.${cat.id}`)}
            </button>
          ))}
        </div>
      </div>

      {conflictWarning && (
        <div
          className="text-[10px] px-2 py-1 rounded"
          style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning-color)' }}
        >
          {t('settings.shortcuts.conflictWarning', {
            label: t(DEFAULT_SHORTCUTS.find((s) => s.id === conflictWarning)?.labelKey ?? 'settings.shortcuts.title'),
          })}
        </div>
      )}

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
            {t('settings.shortcuts.noResults', { query: search })}
          </div>
        ) : filtered.map((sc) => {
          const currentKeys = custom[sc.id] || sc.defaultKeys;
          const isEditing = editingId === sc.id;
          const isCustom = !!custom[sc.id];
          return (
            <div
              key={sc.id}
              className="flex items-center justify-between px-3 py-2 rounded text-xs group"
              style={{
                backgroundColor: isEditing ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                border: isEditing ? '1px solid var(--accent-color)' : 'none',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-primary)' }}>{t(sc.labelKey)}</span>
                <span
                  className="text-[9px] px-1 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                >
                  {t(`settings.shortcuts.category.${sc.category}`)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <kbd
                  onClick={() => { if (!isEditing) { setEditingId(sc.id); setConflictWarning(null); } }}
                  className="px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: isEditing ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: isEditing ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {isEditing && tempKeys ? tempKeys : currentKeys}
                </kbd>
                {isCustom && (
                  <button
                    onClick={() => resetToDefault(sc.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/20"
                    title={t('settings.shortcuts.resetToDefault')}
                  >
                    <RotateCcw size={10} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingId && !conflictWarning && (
        <p className="text-[10px] mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>
          {t('settings.shortcuts.pressNewKey')}
        </p>
      )}
    </div>
  );
}

export function ShortcutsTab() {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
        {t('settings.shortcuts.description')}
      </p>
      <EditableShortcuts />
    </div>
  );
}
