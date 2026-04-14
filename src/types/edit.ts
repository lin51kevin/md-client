// 编辑模式
export type EditMode = 'none' | 'block' | 'inline';

// AST 节点位置
export interface ASTPosition {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

// 带位置的 AST 节点
export interface PositionedNode {
  type: string;
  position: ASTPosition;
  children?: PositionedNode[];
}

// 编辑操作类型
export type EditOperationType = 'block-replace' | 'inline-format' | 'node-delete' | 'node-insert';

// 编辑操作记录
export interface EditOperation {
  type: EditOperationType;
  nodeId: string;
  before: string;
  after: string;
  timestamp: number;
}

// 撤销/重做管理器
export interface EditHistory {
  undoStack: EditOperation[];
  redoStack: EditOperation[];
  maxSize: number;
}

// 编辑状态
export interface EditState {
  mode: EditMode;
  editingNode: PositionedNode | null;
  originalContent: string;
  editedContent: string;
  cursorPosition: number;
}

// 位置映射条目
export interface PositionMapEntry {
  node: PositionedNode;
  sourceText: string;
  startOffset: number;
  endOffset: number;
}

// 支持的可编辑块类型
export const EDITABLE_BLOCK_TYPES = [
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'codeBlock',
] as const;

export type EditableBlockType = (typeof EDITABLE_BLOCK_TYPES)[number];
