import { describe, it, expect, vi } from 'vitest';
import { createCommandsAPI } from '../../plugins/plugin-commands';
import {
  registerCustomCommand,
  unregisterCustomCommand,
  createCommandRegistry,
  customCommands,
} from '../../lib/command-registry';

const makeMockDeps = () => ({
  createNewTab: vi.fn(), handleOpenFile: vi.fn(), handleSaveFile: vi.fn(),
  handleSaveAsFile: vi.fn(), setViewMode: vi.fn(), focusMode: 'normal' as const,
  setFocusMode: vi.fn(), handleFormatAction: vi.fn(), handleExportDocx: vi.fn(),
  handleExportPdf: vi.fn(), handleExportHtml: vi.fn(), handleExportPng: vi.fn(),
  previewRef: { current: null }, setShowSnippetPicker: vi.fn(),
  setShowSnippetManager: vi.fn(), toggleSearchPanel: vi.fn(),
  cmViewRef: { current: null }, isTauri: false,
});

describe('Commands API', () => {
  afterEach(() => {
    // Clean up any custom commands
    customCommands.length = 0;
  });

  it('should register a command and return a disposable', () => {
    const api = createCommandsAPI();
    const handler = vi.fn();
    const disposable = api.register('test.hello', handler);

    expect(typeof disposable.dispose).toBe('function');
    disposable.dispose();
  });

  it('should add command to customCommands registry', () => {
    const api = createCommandsAPI();
    api.register('plugin.test', vi.fn());

    const cmds = createCommandRegistry(makeMockDeps());
    const found = cmds.find(c => c.id === 'plugin.test');
    expect(found).toBeDefined();
    expect(found!.category).toBe('custom');
  });

  it('should remove command when disposable is disposed', () => {
    const api = createCommandsAPI();
    api.register('plugin.remove-me', vi.fn());

    let cmds = createCommandRegistry(makeMockDeps());
    expect(cmds.find(c => c.id === 'plugin.remove-me')).toBeDefined();

    unregisterCustomCommand('plugin.remove-me');

    cmds = createCommandRegistry(makeMockDeps());
    expect(cmds.find(c => c.id === 'plugin.remove-me')).toBeUndefined();
  });
});
