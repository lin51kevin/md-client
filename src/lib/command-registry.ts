import { undo, redo } from '@codemirror/commands';
import type { Command } from './commands';

export interface CommandRegistryDeps {
  createNewTab: () => void;
  handleOpenFile: () => void;
  handleSaveFile: () => void;
  handleSaveAsFile: () => void;
  setViewMode: (m: import('../types').ViewMode) => void;
  focusMode: string;
  setFocusMode: (m: import('../types').FocusMode) => void;
  handleFormatAction: (action: string) => void;
  handleExportDocx: () => void;
  handleExportPdf: () => void;
  handleExportHtml: () => void;
  handleExportPng: (el: HTMLElement | null) => void;
  previewRef: React.RefObject<HTMLElement | null>;
  setShowSnippetPicker: (v: boolean) => void;
  setShowSnippetManager: (v: boolean) => void;
  setShowSearchPanel: (updater: (prev: boolean) => boolean) => void;
  cmViewRef: React.RefObject<import('@codemirror/view').EditorView | null>;
  isTauri: boolean;
}

export function createCommandRegistry(deps: CommandRegistryDeps): Command[] {
  const {
    createNewTab, handleOpenFile, handleSaveFile, handleSaveAsFile,
    setViewMode, focusMode, setFocusMode,
    handleFormatAction, handleExportDocx, handleExportPdf, handleExportHtml,
    handleExportPng, previewRef, setShowSnippetPicker, setShowSnippetManager,
    setShowSearchPanel, cmViewRef, isTauri,
  } = deps;

  return [
    { id: 'file.new', label: '新建标签页', labelEn: 'New Tab', shortcut: 'Ctrl+N', category: 'file', action: () => createNewTab() },
    { id: 'file.open', label: '打开文件', labelEn: 'Open File', shortcut: 'Ctrl+O', category: 'file', action: () => handleOpenFile() },
    { id: 'file.save', label: '保存', labelEn: 'Save', shortcut: 'Ctrl+S', category: 'file', action: () => handleSaveFile() },
    { id: 'file.saveAs', label: '另存为', labelEn: 'Save As', shortcut: 'Ctrl+Shift+S', category: 'file', action: () => handleSaveAsFile() },
    { id: 'edit.find', label: '查找', labelEn: 'Find', shortcut: 'Ctrl+F', category: 'edit', action: () => setShowSearchPanel(p => !p) },
    { id: 'edit.replace', label: '查找替换', labelEn: 'Find & Replace', shortcut: 'Ctrl+H', category: 'edit', action: () => setShowSearchPanel(p => !p) },
    { id: 'edit.undo', label: '撤销', labelEn: 'Undo', shortcut: 'Ctrl+Z', category: 'edit', action: () => { if (cmViewRef.current) undo(cmViewRef.current); } },
    { id: 'edit.redo', label: '重做', labelEn: 'Redo', shortcut: 'Ctrl+Y', category: 'edit', action: () => { if (cmViewRef.current) redo(cmViewRef.current); } },
    { id: 'view.editOnly', label: '仅编辑器', labelEn: 'Editor Only', shortcut: 'Ctrl+1', category: 'view', action: () => setViewMode('edit') },
    { id: 'view.split', label: '分栏预览', labelEn: 'Split Preview', shortcut: 'Ctrl+2', category: 'view', action: () => setViewMode('split') },
    { id: 'view.previewOnly', label: '仅预览', labelEn: 'Preview Only', shortcut: 'Ctrl+3', category: 'view', action: () => setViewMode('preview') },
    { id: 'view.focusTypewriter', label: '打字机模式', labelEn: 'Typewriter Mode', shortcut: 'Ctrl+.', category: 'view', action: () => setFocusMode(focusMode === 'typewriter' ? 'normal' : 'typewriter') },
    { id: 'view.focusMode', label: '专注模式', labelEn: 'Focus Mode', shortcut: 'Ctrl+,', category: 'view', action: () => setFocusMode(focusMode === 'focus' ? 'normal' : 'focus') },
    { id: 'view.fullscreen', label: '全屏模式', labelEn: 'Fullscreen', shortcut: 'F11', category: 'view', action: async () => {
      if (!isTauri) return;
      try { const { getCurrentWindow: gcw } = await import('@tauri-apps/api/window'); const w = gcw(); w.isFullscreen().then(fs => w.setFullscreen(!fs)); } catch {}
    }},
    { id: 'format.bold', label: '加粗', labelEn: 'Bold', shortcut: 'Ctrl+B', category: 'format', action: () => handleFormatAction('bold') },
    { id: 'format.italic', label: '斜体', labelEn: 'Italic', shortcut: 'Ctrl+I', category: 'format', action: () => handleFormatAction('italic') },
    { id: 'format.strikethrough', label: '删除线', labelEn: 'Strikethrough', shortcut: '', category: 'format', action: () => handleFormatAction('strikethrough') },
    { id: 'format.code', label: '行内代码', labelEn: 'Inline Code', shortcut: 'Ctrl+`', category: 'format', action: () => handleFormatAction('code') },
    { id: 'format.link', label: '插入链接', labelEn: 'Insert Link', shortcut: 'Ctrl+K', category: 'format', action: () => handleFormatAction('link') },
    { id: 'format.image', label: '插入图片', labelEn: 'Insert Image', shortcut: '', category: 'format', action: () => handleFormatAction('image-local') },
    { id: 'export.docx', label: '导出 Word', labelEn: 'Export Word', shortcut: '', category: 'export', action: () => handleExportDocx() },
    { id: 'export.pdf', label: '导出 PDF', labelEn: 'Export PDF', shortcut: '', category: 'export', action: () => handleExportPdf() },
    { id: 'export.html', label: '导出 HTML', labelEn: 'Export HTML', shortcut: '', category: 'export', action: () => handleExportHtml() },
    { id: 'export.png', label: '导出 PNG', labelEn: 'Export PNG', shortcut: '', category: 'export', action: () => handleExportPng(previewRef.current) },
    { id: 'snippet.insert', label: '插入片段', labelEn: 'Insert Snippet', shortcut: '', category: 'custom', action: () => setShowSnippetPicker(true) },
    { id: 'snippet.manager', label: '片段管理', labelEn: 'Snippet Manager', shortcut: '', category: 'custom', action: () => setShowSnippetManager(true) },
  ];
}
