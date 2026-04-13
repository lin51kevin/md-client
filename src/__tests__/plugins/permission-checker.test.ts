import { describe, it, expect } from 'vitest';
import { PermissionChecker, PluginPermissionError } from '../../plugins/permission-checker';

describe('PermissionChecker', () => {
  it('has returns true for granted permission', () => {
    const c = new PermissionChecker(['editor.read', 'storage']);
    expect(c.has('editor.read')).toBe(true);
    expect(c.has('storage')).toBe(true);
    expect(c.has('editor.write')).toBe(false);
  });

  it('checkAll returns missing permissions', () => {
    const c = new PermissionChecker(['editor.read']);
    const missing = c.checkAll(['editor.read', 'editor.write', 'storage']);
    expect(missing).toEqual(['editor.write', 'storage']);
  });

  it('checkAll returns empty array when all granted', () => {
    const c = new PermissionChecker(['editor.read', 'editor.write']);
    expect(c.checkAll(['editor.read', 'editor.write'])).toEqual([]);
  });

  it('assert throws PluginPermissionError for missing permission', () => {
    const c = new PermissionChecker(['editor.read']);
    expect(() => c.assert('editor.write')).toThrow(PluginPermissionError);
    expect(() => c.assert('editor.write')).toThrow('Permission denied: editor.write');
  });

  it('assert does not throw for granted permission', () => {
    const c = new PermissionChecker(['editor.read']);
    expect(() => c.assert('editor.read')).not.toThrow();
  });

  it('grant adds permissions', () => {
    const c = new PermissionChecker(['editor.read']);
    c.grant(['editor.write', 'storage']);
    expect(c.has('editor.write')).toBe(true);
    expect(c.has('storage')).toBe(true);
  });

  it('revoke removes permissions', () => {
    const c = new PermissionChecker(['editor.read', 'editor.write']);
    c.revoke(['editor.write']);
    expect(c.has('editor.write')).toBe(false);
    expect(c.has('editor.read')).toBe(true);
  });

  it('getAll returns all granted permissions', () => {
    const c = new PermissionChecker(['editor.read', 'storage']);
    expect(c.getAll().sort()).toEqual(['editor.read', 'storage']);
  });

  it('constructor with empty array', () => {
    const c = new PermissionChecker([]);
    expect(c.getAll()).toEqual([]);
    expect(c.has('editor.read')).toBe(false);
  });
});
