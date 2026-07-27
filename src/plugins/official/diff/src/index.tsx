import React from 'react';
import type { PluginContext } from '../../../plugin-sandbox';
import { ComparePicker } from './ComparePicker';
import { mountDiffController, unmountDiffController } from './DiffController';
import { terminateDiffWorker } from './diff-client';
import { openPicker } from './events';
import { createDiffT, getLocale } from './i18n';

interface PluginResult {
  deactivate: () => void;
}

/** git-compare (lucide) icon as an inline SVG for the status bar button. */
const COMPARE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
  + '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>'
  + '<path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/></svg>';

/** Build the status bar launcher button. */
function createStatusBarButton(label: string): HTMLElement {
  const btn = document.createElement('button');
  btn.id = 'marklite-diff-statusbar-btn';
  btn.type = 'button';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 6px;border:none;'
    + 'background:transparent;color:var(--text-secondary,#ccc);cursor:pointer;border-radius:3px;font-size:12px;';
  btn.innerHTML = `${COMPARE_SVG}<span>${label}</span>`;
  btn.addEventListener('mouseenter', () => { btn.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.1))'; });
  btn.addEventListener('mouseleave', () => { btn.style.backgroundColor = 'transparent'; });
  btn.addEventListener('click', () => openPicker(null));
  return btn;
}

/**
 * Activate the Text Compare plugin. Provides multiple friendly entry points:
 * a sidebar panel, the command palette, the editor right-click menu and a
 * status bar button — all backed by a persistent controller so a comparison
 * can be launched no matter which surface the user starts from.
 */
export function activate(ctx: PluginContext): PluginResult {
  const t = createDiffT(getLocale());

  // Always-mounted controller that owns the picker + overlay.
  mountDiffController(ctx);

  // 1. Sidebar panel (persistent picker).
  const panel = ctx.sidebar.registerPanel('diff-compare', {
    title: t('diff.panelTitle'),
    icon: 'git-compare',
    position: 'left',
    render: () => React.createElement(ComparePicker, { ctx, variant: 'panel' }),
  });

  // 2. Command palette.
  const cmd = ctx.commands.register('diff.compare', () => {
    const active = ctx.workspace.getActiveFile();
    openPicker(active.path);
  }, {
    label: '比较文件… (Ctrl+Shift+D)',
    labelEn: 'Compare Files… (Ctrl+Shift+D)',
    category: 'Compare',
  });

  // 3. Editor right-click context menu.
  const menuItem = ctx.contextMenu.addItem({
    id: 'diff.compareWith',
    label: t('diff.contextCompare'),
    icon: 'git-compare',
    group: 'compare',
    order: 100,
    action: () => {
      const active = ctx.workspace.getActiveFile();
      openPicker(active.path);
    },
  });

  // 4. Status bar button.
  const statusButton = createStatusBarButton(t('diff.statusTitle'));
  const statusItem = ctx.statusbar.addItem(statusButton);

  // 5. Keyboard shortcut: Ctrl+Shift+D opens the compare picker.
  const onKeydown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      const active = ctx.workspace.getActiveFile();
      openPicker(active.path);
    }
  };
  window.addEventListener('keydown', onKeydown, true);

  return {
    deactivate: () => {
      panel.dispose();
      cmd.dispose();
      menuItem.dispose();
      statusItem.dispose();
      window.removeEventListener('keydown', onKeydown, true);
      unmountDiffController();
      terminateDiffWorker();
    },
  };
}

export function deactivate(): void {
  // Cleanup handled via the return value of activate.
}
