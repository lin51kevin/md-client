/** Minimal self-contained i18n for the Text Compare plugin (EN / ZH-CN). */

type Dict = Record<string, string>;

const EN: Dict = {
  'diff.panelTitle': 'Compare',
  'diff.command': 'Compare Files…',
  'diff.contextCompare': 'Compare with another file…',
  'diff.statusTitle': 'Compare files',
  'diff.pickerTitle': 'Choose what to compare',
  'diff.cancel': 'Cancel',
  'diff.sourceA': 'Left (A)',
  'diff.sourceB': 'Right (B)',
  'diff.kindFile': 'File',
  'diff.kindText': 'Clipboard / Text',
  'diff.selectFile': 'Select a file…',
  'diff.pasteHere': 'Paste or type text here…',
  'diff.readClipboard': 'Read clipboard',
  'diff.swap': 'Swap sides',
  'diff.start': 'Compare',
  'diff.pasteIntoPane': 'Paste clipboard into this pane',
  'diff.openFileIntoPane': 'Open a file into this pane',
  'diff.openFileFailed': 'Could not open the file.',
  'diff.needBothSources': 'Choose a source for both sides first.',
  'diff.clipboardFailed': 'Could not read the clipboard. Paste manually with Ctrl+V.',
  'diff.clipboardEmpty': 'The clipboard is empty.',
  'diff.emptyText': '(empty)',
  'diff.computing': 'Comparing…',
  'diff.identical': 'The two sources are identical.',
  'diff.truncated': 'Input is too large to compare safely.',
  'diff.onlyDiffs': 'Only differences',
  'diff.nextDiff': 'Next difference (F7)',
  'diff.prevDiff': 'Previous difference (Shift+F7)',
  'diff.firstDiff': 'First difference',
  'diff.lastDiff': 'Last difference',
  'diff.ignoreWhitespace': 'Ignore whitespace',
  'diff.ignoreCase': 'Ignore case',
  'diff.syncScroll': 'Synchronized scrolling',
  'diff.close': 'Close (Esc)',
  'diff.added': 'added',
  'diff.removed': 'removed',
  'diff.modified': 'modified',
  'diff.collapsed': '{count} identical lines',
  'diff.clipboardLabel': 'Clipboard',
  'diff.textLabel': 'Text',
};

const ZH_CN: Dict = {
  'diff.panelTitle': '文本比较',
  'diff.command': '比较文件…',
  'diff.contextCompare': '与其他文件比较…',
  'diff.statusTitle': '文本比较',
  'diff.pickerTitle': '选择要比较的内容',
  'diff.cancel': '取消',
  'diff.sourceA': '左侧 (A)',
  'diff.sourceB': '右侧 (B)',
  'diff.kindFile': '文件',
  'diff.kindText': '剪贴板 / 文本',
  'diff.selectFile': '选择文件…',
  'diff.pasteHere': '在此粘贴或输入文本…',
  'diff.readClipboard': '读取剪贴板',
  'diff.swap': '交换两侧',
  'diff.start': '开始比较',
  'diff.pasteIntoPane': '粘贴剪贴板到此栏',
  'diff.openFileIntoPane': '打开文件到此栏',
  'diff.openFileFailed': '无法打开该文件。',
  'diff.needBothSources': '请先为两侧都选择来源。',
  'diff.clipboardFailed': '无法读取剪贴板，请用 Ctrl+V 手动粘贴。',
  'diff.clipboardEmpty': '剪贴板为空。',
  'diff.emptyText': '（空）',
  'diff.computing': '正在比较…',
  'diff.identical': '两个来源内容完全相同。',
  'diff.truncated': '内容过大，无法安全比较。',
  'diff.onlyDiffs': '仅显示差异',
  'diff.nextDiff': '下一处差异 (F7)',
  'diff.prevDiff': '上一处差异 (Shift+F7)',
  'diff.firstDiff': '第一处差异',
  'diff.lastDiff': '最后一处差异',
  'diff.ignoreWhitespace': '忽略空白',
  'diff.ignoreCase': '忽略大小写',
  'diff.syncScroll': '同步滚动',
  'diff.close': '关闭 (Esc)',
  'diff.added': '新增',
  'diff.removed': '删除',
  'diff.modified': '修改',
  'diff.collapsed': '{count} 行相同',
  'diff.clipboardLabel': '剪贴板',
  'diff.textLabel': '文本',
};

/** Read the app locale saved by MarkLite (same key the Git plugin uses). */
export function getLocale(): string {
  try {
    return localStorage.getItem('marklite-locale') ?? 'en';
  } catch {
    return 'en';
  }
}

/** Build a translator bound to the given locale. */
export function createDiffT(locale: string): (key: string, params?: Record<string, string | number>) => string {
  const dict = locale.startsWith('zh') ? ZH_CN : EN;
  return (key, params) => {
    let str = dict[key] ?? EN[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  };
}

export type DiffT = ReturnType<typeof createDiffT>;
