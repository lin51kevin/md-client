import type { EditOperation, EditHistory } from '../types/edit';

/**
 * 编辑历史管理器 - 支持撤销/重做
 */
export class EditHistoryManager implements EditHistory {
  undoStack: EditOperation[] = [];
  redoStack: EditOperation[] = [];
  maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * 记录一次编辑操作
   * 新操作会清空 redo 栈
   */
  push(operation: EditOperation): void {
    this.redoStack = [];
    this.undoStack.push(operation);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  /**
   * 撤销
   */
  undo(): EditOperation | null {
    if (this.undoStack.length === 0) return null;
    const op = this.undoStack.pop()!;
    this.redoStack.push(op);
    return op;
  }

  /**
   * 重做
   */
  redo(): EditOperation | null {
    if (this.redoStack.length === 0) return null;
    const op = this.redoStack.pop()!;
    this.undoStack.push(op);
    return op;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  get size(): number {
    return this.undoStack.length + this.redoStack.length;
  }
}
