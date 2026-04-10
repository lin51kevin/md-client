import { useState, useRef, useEffect, useCallback } from 'react';
import { FilePlus, Clock, Save, SaveAll, FileText, Printer, FileCode, Trash2, ChevronRight, Download } from 'lucide-react';
import type { RecentFile } from '../lib/recent-files';
import { useI18n } from '../i18n';

export interface FileMenuDropdownProps {
  onNewTab: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onExportHtml: () => void;
  recentFiles?: RecentFile[];
  onOpenRecent?: (path: string) => void;
  onClearRecent?: () => void;
}

interface MenuItem {
  id: string;
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  action?: () => void;
  submenu?: MenuItem[];
  danger?: boolean;
}

export function FileMenuDropdown({
  onNewTab,
  onOpenFile,
  onSaveFile,
  onSaveAsFile,
  onExportDocx,
  onExportPdf,
  onExportHtml,
  recentFiles,
  onOpenRecent,
  onClearRecent,
}: FileMenuDropdownProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSubmenu(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setSubmenu(null);
    }, 100);
  }, []);

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.submenu) {
      setSubmenu(submenu === item.id ? null : item.id);
    } else {
      item.action?.();
      setOpen(false);
      setSubmenu(null);
    }
  }, [submenu]);

  const baseItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '6px 12px',
    fontSize: 12,
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    transition: 'background-color 0.1s',
    borderRadius: 4,
    outline: 'none',
    color: 'var(--text-primary)',
  };

  const iconStyle: React.CSSProperties = { opacity: 0.7, flexShrink: 0 };
  const shortcutStyle: React.CSSProperties = { marginLeft: 'auto', fontSize: 11, opacity: 0.5 };
  const arrowStyle: React.CSSProperties = { marginLeft: 'auto', opacity: 0.5 };

  const renderItem = (item: MenuItem, isSub: boolean = false) => {
    const isActive = submenu === item.id;
    return (
      <div key={item.id} style={{ position: 'relative' }}>
        <button
          style={{
            ...baseItemStyle,
            color: item.danger ? '#ef4444' : 'var(--text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isSub ? 'var(--bg-tertiary)' : 'var(--accent-color)';
            e.currentTarget.style.color = isSub ? 'var(--text-primary)' : 'var(--bg-primary)';
            if (item.submenu) setSubmenu(item.id);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.color = item.danger ? '#ef4444' : 'var(--text-primary)';
          }}
          onClick={() => handleItemClick(item)}
          title={item.label}
        >
          <span style={iconStyle}>{item.icon}</span>
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.shortcut && !item.submenu && (
            <span style={shortcutStyle}>{item.shortcut}</span>
          )}
          {item.submenu && <ChevronRight size={12} style={arrowStyle} />}
        </button>

        {/* Submenu */}
        {item.submenu && isActive && (
          <div
            className={item.id === 'recent' ? 'file-menu-recent-list' : undefined}
            style={{
              position: 'absolute',
              left: '100%',
              top: 0,
              minWidth: 220,
              maxHeight: 320,
              overflowY: item.id === 'recent' ? 'auto' : undefined,
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              padding: '4px 0',
              boxShadow: 'var(--shadow-xl)',
              zIndex: 10000,
            }}
          >
            {item.submenu.map((sub) => renderItem(sub, true))}
          </div>
        )}
      </div>
    );
  };

  const recentItems: MenuItem[] = recentFiles && recentFiles.length > 0
    ? [
        ...recentFiles.slice(0, 10).map((f) => ({
          id: `recent-${f.path}`,
          
          label: f.name,
          action: () => { onOpenRecent?.(f.path); },
        })),
        {
          id: 'clear-recent',
          icon: <Trash2 size={13} strokeWidth={1.8} />,
          label: t('file.clearRecent'),
          action: () => { onClearRecent?.(); setSubmenu(null); },
          danger: true,
        } as MenuItem,
      ]
    : [
        {
          id: 'no-recent',
          icon: <Clock size={13} strokeWidth={1.8} />,
          label: t('file.noRecent'),
          action: undefined,
        } as MenuItem,
      ];

  const exportItems: MenuItem[] = [
    {
      id: 'export-docx',
      icon: <FileText size={13} strokeWidth={1.8} />,
      label: t('file.exportDocx'),
      action: onExportDocx,
    },
    {
      id: 'export-pdf',
      icon: <Printer size={13} strokeWidth={1.8} />,
      label: t('file.exportPdf'),
      action: onExportPdf,
    },
    {
      id: 'export-html',
      icon: <FileCode size={13} strokeWidth={1.8} />,
      label: t('file.exportHtml'),
      action: onExportHtml,
    },
  ];

  const menuItems: MenuItem[] = [
    {
      id: 'new',
      icon: <FilePlus size={13} strokeWidth={1.8} />,
      label: t('file.new'),
      shortcut: 'Ctrl+N',
      action: onNewTab,
    },
    {
      id: 'open',
      icon: <FileText size={13} strokeWidth={1.8} />,
      label: t('file.open'),
      shortcut: 'Ctrl+O',
      action: onOpenFile,
    },
    {
      id: 'recent',
      icon: <Clock size={13} strokeWidth={1.8} />,
      label: t('file.openRecent'),
      submenu: recentItems,
    },
    { id: 'sep1', icon: null, label: '' } as unknown as MenuItem,
    {
      id: 'save',
      icon: <Save size={13} strokeWidth={1.8} />,
      label: t('file.save'),
      shortcut: 'Ctrl+S',
      action: onSaveFile,
    },
    {
      id: 'saveas',
      icon: <SaveAll size={13} strokeWidth={1.8} />,
      label: t('file.saveAs'),
      shortcut: 'Ctrl+Shift+S',
      action: onSaveAsFile,
    },
    { id: 'sep2', icon: null, label: '' } as unknown as MenuItem,
    {
      id: 'export',
      icon: <Download size={13} strokeWidth={1.8} />,
      label: t('file.export'),
      submenu: exportItems,
    },
  ];

  const separatorColor = 'var(--border-color)';

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={t('toolbar.fileMenu')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          fontSize: 12,
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          backgroundColor: open ? 'var(--accent-bg)' : 'transparent',
          borderColor: open ? 'var(--accent-color)' : 'transparent',
          color: open ? 'var(--accent-color)' : 'var(--text-secondary)',
          transition: 'all 0.1s',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <FileText size={14} strokeWidth={1.8} />
        <span>{t('toolbar.fileMenu')}</span>
      </button>

      {/* 下拉面板 */}
      {open && (
        <div
          onMouseLeave={handleClose}
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            marginTop: 4,
            minWidth: 220,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '4px 0',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            zIndex: 9999,
          }}
        >
          {menuItems.map((item) => {
            if (item.id.startsWith('sep')) {
              return (
                <div
                  key={item.id}
                  style={{
                    height: 1,
                    margin: '4px 8px',
                    backgroundColor: separatorColor,
                  }}
                />
              );
            }
            return renderItem(item);
          })}
        </div>
      )}
    </div>
  );
}
