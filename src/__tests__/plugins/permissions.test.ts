import { describe, it, expect } from 'vitest';
import {
  getPermissionLevel,
  PERMISSION_DESCRIPTIONS,
  DANGEROUS_PERMISSIONS,
  isDangerous,
} from '../../plugins/permissions';
import type { PluginPermission } from '../../plugins/permissions';

describe('permissions', () => {
  it('every permission has a level', () => {
    const all: PluginPermission[] = [
      'file.read', 'file.write', 'file.watch',
      'sidebar.panel', 'statusbar.item', 'contextmenu.item',
      'editor.read', 'editor.write', 'editor.decorate',
      'workspace', 'preview.extend', 'settings.section',
      'theme', 'export', 'ui.message', 'storage',
      'commands', 'tauri.raw',
    ];
    for (const p of all) {
      expect(['low', 'medium', 'high', 'critical']).toContain(getPermissionLevel(p));
    }
  });

  it('dangerous permissions are critical', () => {
    for (const p of DANGEROUS_PERMISSIONS) {
      expect(getPermissionLevel(p)).toBe('critical');
    }
  });

  it('every permission has a zh and en description', () => {
    const all: PluginPermission[] = [
      'file.read', 'file.write', 'file.watch',
      'sidebar.panel', 'statusbar.item', 'contextmenu.item',
      'editor.read', 'editor.write', 'editor.decorate',
      'workspace', 'preview.extend', 'settings.section',
      'theme', 'export', 'ui.message', 'storage',
      'commands', 'tauri.raw',
    ];
    for (const p of all) {
      const desc = PERMISSION_DESCRIPTIONS[p];
      expect(desc).toBeDefined();
      expect(desc.zh).toBeTruthy();
      expect(desc.en).toBeTruthy();
    }
  });

  it('isDangerous returns true for dangerous permissions', () => {
    expect(isDangerous('tauri.raw')).toBe(true);
    expect(isDangerous('file.write')).toBe(true);
    expect(isDangerous('editor.read')).toBe(false);
  });
});
