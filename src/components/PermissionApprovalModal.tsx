import { useState, useEffect, useCallback } from 'react';
import { X, Shield, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { PluginPermission } from '../plugins/permissions';
import {
  PERMISSION_DESCRIPTIONS,
  getPermissionLevel,
  DANGEROUS_PERMISSIONS,
} from '../plugins/permissions';
import { useI18n } from '../i18n';

export interface PermissionApprovalModalProps {
  visible: boolean;
  pluginName: string;
  permissions: PluginPermission[];
  onApprove: (granted: PluginPermission[]) => void;
  onCancel: () => void;
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  low:      { bg: '#dcfce7', text: '#166534' },
  medium:   { bg: '#fef9c3', text: '#854d0e' },
  high:     { bg: '#ffedd5', text: '#c2410c' },
  critical: { bg: '#fee2e2', text: '#dc2626' },
};

export function PermissionApprovalModal({
  visible,
  pluginName,
  permissions,
  onApprove,
  onCancel,
}: PermissionApprovalModalProps) {
  const dangerousRequested = permissions.filter(p => DANGEROUS_PERMISSIONS.includes(p));
  const hasDangerous = dangerousRequested.length > 0;

  const { locale, t } = useI18n();

  const [checked, setChecked] = useState<Set<PluginPermission>>(() => {
    const s = new Set<PluginPermission>();
    for (const p of permissions) {
      if (!DANGEROUS_PERMISSIONS.includes(p)) s.add(p);
    }
    return s;
  });

  useEffect(() => {
    if (visible) {
      const s = new Set<PluginPermission>();
      for (const p of permissions) {
        if (!DANGEROUS_PERMISSIONS.includes(p)) s.add(p);
      }
      setChecked(s);
    }
  }, [visible, permissions]);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && visible) onCancel();
  }, [visible, onCancel]);

  useEffect(() => {
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [handleEscape]);

  const toggle = (p: PluginPermission) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const allDangerousChecked = hasDangerous
    ? dangerousRequested.every(p => checked.has(p))
    : true;

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[10000]"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          width: 520,
          maxHeight: '80vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: 'var(--accent-color)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('perm.title', { name: pluginName })}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Permission list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {permissions.map(p => {
            const level = getPermissionLevel(p);
            const desc = PERMISSION_DESCRIPTIONS[p];
            const dangerous = DANGEROUS_PERMISSIONS.includes(p);
            const isChecked = checked.has(p);
            const colors = LEVEL_COLORS[level];

            return (
              <div
                key={p}
                data-permission={p}
                className="flex items-start gap-3 px-3 py-2 rounded"
                style={{
                  backgroundColor: dangerous ? 'var(--hover-overlay)' : 'var(--bg-secondary)',
                  border: dangerous ? '1px solid #fca5a5' : 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(p)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                      {p}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {level}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {locale === 'zh-CN' ? desc.zh : desc.en}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {locale === 'zh-CN' ? desc.en : desc.zh}
                  </p>
                  {dangerous && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} style={{ color: '#dc2626' }} />
                      <span className="text-[10px]" style={{ color: '#dc2626' }}>
                        {t('perm.dangerousWarning', { desc: locale === 'zh-CN' ? desc.zh : desc.en })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs transition-colors"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {t('perm.cancel')}
          </button>
          <button
            disabled={!allDangerousChecked}
            onClick={() => onApprove([...checked])}
            className="px-3 py-1.5 rounded text-xs text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: allDangerousChecked
                ? 'var(--accent-color, #0969da)'
                : 'var(--bg-tertiary)',
              color: allDangerousChecked ? '#fff' : 'var(--text-secondary)',
              border: '1px solid ' + (allDangerousChecked ? 'var(--accent-color, #0969da)' : 'var(--border-color)'),
            }}
          >
            <span className="flex items-center gap-1">
              <ShieldAlert size={12} />
              {t('perm.approve')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
