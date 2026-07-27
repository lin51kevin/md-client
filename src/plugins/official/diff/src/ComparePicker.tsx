import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, FolderOpen, GitCompare, X } from 'lucide-react';
import type { PluginContext } from '../../../plugin-sandbox';
import { createDiffT, getLocale } from './i18n';
import { startCompare } from './events';
import type { DiffSource } from './types';

function basename(p: string): string {
  return p.split(/[/\\]/).pop() || p;
}

const FILE_EXTENSIONS = ['md', 'markdown', 'txt', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'yml', 'yaml', 'xml', 'py'];

interface ComparePickerProps {
  ctx: PluginContext;
  /** 'panel' renders inline for the sidebar; 'modal' renders a centered dialog. */
  variant: 'panel' | 'modal';
  /** Prefill the left file path (used when launched from a command/menu). */
  initialAPath?: string;
  /** Close callback (modal only). */
  onClose?: () => void;
}

/**
 * Source selection UI for the Text Compare plugin. Picks two workspace files to
 * compare; clipboard/text and loading other files are handled inside the diff
 * overlay itself. On "Compare" it dispatches the sources to the global
 * controller which owns the overlay.
 */
export const ComparePicker: React.FC<ComparePickerProps> = ({ ctx, variant, initialAPath, onClose }) => {
  const t = createDiffT(getLocale());
  const files = (() => {
    try { return ctx.workspace.getAllFiles(); } catch { return []; }
  })();
  const [aPath, setAPath] = useState(() => {
    if (initialAPath) return initialAPath;
    try {
      const active = ctx.workspace.getActiveFile();
      if (active.path && files.includes(active.path)) return active.path;
      return files[0] ?? '';
    } catch {
      return '';
    }
  });
  const [bPath, setBPath] = useState(() => files.find((f) => f !== initialAPath) ?? '');

  // Close the modal on Escape.
  useEffect(() => {
    if (variant !== 'modal') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose?.(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [variant, onClose]);

  const compare = useCallback(() => {
    if (!aPath || !bPath) { ctx.ui.showMessage(t('diff.needBothSources'), 'warning'); return; }
    const a: DiffSource = { kind: 'file', path: aPath, name: aPath };
    const b: DiffSource = { kind: 'file', path: bPath, name: bPath };
    startCompare(a, b);
    if (variant === 'modal') onClose?.();
  }, [aPath, bPath, ctx, t, variant, onClose]);

  const swapSides = useCallback(() => {
    setAPath(bPath);
    setBPath(aPath);
  }, [aPath, bPath]);

  const pickFile = useCallback(async (setPath: (p: string) => void) => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Text', extensions: FILE_EXTENSIONS }],
      });
      const p = Array.isArray(selected) ? selected[0] : selected;
      if (p) setPath(p);
    } catch {
      ctx.ui.showMessage(t('diff.openFileFailed'), 'error');
    }
  }, [ctx, t]);

  const renderFilePicker = (label: string, path: string, setPath: (p: string) => void) => {
    // Include a chosen system file in the options even if it's not a workspace file.
    const options = path && !files.includes(path) ? [path, ...files] : files;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>{label}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <select
            value={path}
            onChange={(e) => setPath(e.target.value)}
            title={path || undefined}
            style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border-color, #3a3a4a)', backgroundColor: 'var(--bg-primary, #1a1a24)', color: 'var(--text-primary, #e6e6e6)' }}
          >
            <option value="">{t('diff.selectFile')}</option>
            {options.map((f) => <option key={f} value={f}>{basename(f)}</option>)}
          </select>
          <button
            type="button"
            title={t('diff.openFileIntoPane')}
            aria-label={t('diff.openFileIntoPane')}
            onClick={() => pickFile(setPath)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, flexShrink: 0, border: '1px solid var(--border-color, #3a3a4a)', borderRadius: 4, backgroundColor: 'transparent', color: 'var(--text-secondary, #cbd5e1)', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.1))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <FolderOpen size={14} />
          </button>
        </div>
      </div>
    );
  };

  const body = (
    <>
      {variant === 'modal' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{t('diff.pickerTitle')}</span>
          <button
            type="button"
            title={t('diff.close')}
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 22, border: 'none', borderRadius: 4, backgroundColor: 'transparent', color: 'var(--text-tertiary, #888)', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {renderFilePicker(t('diff.sourceA'), aPath, setAPath)}

      <button
        type="button"
        onClick={swapSides}
        title={t('diff.swap')}
        style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 24, border: '1px solid var(--border-color, #3a3a4a)', borderRadius: 4, backgroundColor: 'transparent', color: 'var(--text-secondary, #cbd5e1)', cursor: 'pointer' }}
      >
        <ArrowLeftRight size={15} />
      </button>

      {renderFilePicker(t('diff.sourceB'), bPath, setBPath)}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {variant === 'modal' && (
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: '8px 10px', fontSize: 12, border: '1px solid var(--border-color, #3a3a4a)', borderRadius: 6, cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--text-secondary, #cbd5e1)' }}
          >
            {t('diff.cancel')}
          </button>
        )}
        <button
          type="button"
          onClick={compare}
          style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', backgroundColor: 'var(--accent-color, #4a9eff)', color: '#fff' }}
        >
          <GitCompare size={15} /> {t('diff.start')}
        </button>
      </div>
    </>
  );

  if (variant === 'panel') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12, height: '100%', overflow: 'auto', backgroundColor: 'var(--bg-secondary, #252533)', color: 'var(--text-primary, #e6e6e6)' }}>
        {body}
      </div>
    );
  }

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, width: 380, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 64px)', overflow: 'auto', borderRadius: 10, border: '1px solid var(--border-color, #3a3a4a)', backgroundColor: 'var(--bg-secondary, #252533)', color: 'var(--text-primary, #e6e6e6)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        {body}
      </div>
    </div>
  );
};
