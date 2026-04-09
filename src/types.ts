export interface Tab {
  id: string;
  filePath: string | null;
  doc: string;
  isDirty: boolean;
}

export type ViewMode = 'split' | 'edit' | 'preview';

/** F009 — 编辑器焦点模式 */
export type FocusMode = 'normal' | 'typewriter' | 'focus' | 'fullscreen';

/** F011 — 主题名称 */
export type ThemeName = 'light' | 'dark' | 'sepia';
