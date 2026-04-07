export interface Tab {
  id: string;
  filePath: string | null;
  doc: string;
  isDirty: boolean;
}

export type ViewMode = 'split' | 'edit' | 'preview';
