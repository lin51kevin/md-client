import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock git-commands to prevent Tauri invoke calls
vi.mock('../../../../plugins/official/git/src/git-commands', () => ({
  gitGetRepo: vi.fn().mockResolvedValue(null),
  gitGetStatus: vi.fn().mockResolvedValue([]),
  gitDiff: vi.fn().mockResolvedValue(''),
  gitCommit: vi.fn().mockResolvedValue(undefined),
  gitPull: vi.fn().mockResolvedValue(undefined),
  gitPush: vi.fn().mockResolvedValue(undefined),
  gitStage: vi.fn().mockResolvedValue(undefined),
  gitUnstage: vi.fn().mockResolvedValue(undefined),
  gitRestore: vi.fn().mockResolvedValue(undefined),
}));

import { activate, deactivate } from '../../../../plugins/official/git/src/index';
import type { PluginContext } from '../../../../plugins/plugin-sandbox';

function createMockContext(): PluginContext {
  return {
    sidebar: {
      registerPanel: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    },
    commands: {
      register: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    },
    workspace: {
      getActiveFile: vi.fn().mockReturnValue({ path: null, name: null }),
      getAllFiles: vi.fn().mockReturnValue([]),
      openFile: vi.fn(),
      onFileChanged: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      createNewDoc: vi.fn(),
    },
    editor: {
      getContent: vi.fn().mockReturnValue(''),
      getSelection: vi.fn().mockReturnValue(null),
      getCursorPosition: vi.fn().mockReturnValue({ line: 0, column: 0, offset: 0 }),
      insertText: vi.fn(),
      replaceRange: vi.fn(),
      getActiveFilePath: vi.fn().mockReturnValue(null),
    },
    storage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    statusbar: { addItem: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    ui: { showMessage: vi.fn(), showModal: vi.fn().mockResolvedValue(undefined) },
    files: { readFile: vi.fn().mockResolvedValue(null), watch: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    contextMenu: { addItem: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    preview: { registerRenderer: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    settings: { registerSection: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    theme: { register: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    export: { registerExporter: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
  } as unknown as PluginContext;
}

describe('git plugin entry', () => {
  let ctx: PluginContext;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  it('activate registers a sidebar panel with id "git-official"', () => {
    activate(ctx);
    expect(ctx.sidebar.registerPanel).toHaveBeenCalledTimes(1);
    const call = vi.mocked(ctx.sidebar.registerPanel).mock.calls[0];
    expect(call[0]).toBe('git-official');
  });

  it('activate registers sidebar panel with title "Source Control"', () => {
    activate(ctx);
    const call = vi.mocked(ctx.sidebar.registerPanel).mock.calls[0];
    expect(call[1].title).toBe('Source Control');
  });

  it('activate registers sidebar panel with icon "git-branch"', () => {
    activate(ctx);
    const call = vi.mocked(ctx.sidebar.registerPanel).mock.calls[0];
    expect(call[1].icon).toBe('git-branch');
  });

  it('activate registers a render function that returns non-null', () => {
    activate(ctx);
    const call = vi.mocked(ctx.sidebar.registerPanel).mock.calls[0];
    const rendered = call[1].render();
    expect(rendered).not.toBeNull();
    expect(rendered).toBeDefined();
  });

  it('deactivate disposes registered panel', () => {
    const result = activate(ctx);
    const panelDispose = vi.mocked(ctx.sidebar.registerPanel).mock.results[0].value.dispose;
    result.deactivate();
    expect(panelDispose).toHaveBeenCalled();
  });
});
