export interface Tab {
  id: string;
  filePath: string | null;
  /** F013: Tab 重命名 — 自定义显示名称（优先于 filePath 推导出名称） */
  displayName?: string;
  /** F013: 固定标签页（固定标签不可关闭和拖拽排序） */
  isPinned?: boolean;
  doc: string;
  isDirty: boolean;
}

export type ViewMode = 'split' | 'edit' | 'preview';

/** F009 — 编辑器焦点模式 */
export type FocusMode = 'normal' | 'typewriter' | 'focus' | 'fullscreen';

/** F011 — 主题名称（从 lib/theme 导出） */
export type { ThemeName } from './lib/theme';
