/**
 * Milkdown ↔ CodeMirror 双向同步管理器
 *
 * 核心问题：避免循环更新
 * - CodeMirror 编辑 → 更新 Milkdown → Milkdown 触发 onChange → 不应该再回调 CodeMirror
 * - Milkdown 编辑 → 更新 CodeMirror → CodeMirror 触发 onChange → 不应该再回调 Milkdown
 */
export class MilkdownSyncManager {
  private syncSource: 'codemirror' | 'milkdown' | null = null;
  private pendingUpdate: { source: string; content: string } | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs: number;

  constructor(debounceMs = 300) {
    this.debounceMs = debounceMs;
  }

  /**
   * 标记更新来源，返回是否应该处理这次更新
   * 如果当前已有同步来源标记，说明是循环更新，应忽略
   */
  markSource(source: 'codemirror' | 'milkdown'): boolean {
    if (this.syncSource !== null && this.syncSource !== source) {
      console.debug(`[MilkdownSync] ignoring ${source} update: current source is ${this.syncSource}`);
      return false;
    }
    this.syncSource = source;
    console.debug(`[MilkdownSync] source marked: ${source}`);
    return true;
  }

  /**
   * 清除来源标记（在更新完成后调用）
   */
  clearSource(): void {
    const prev = this.syncSource;
    this.syncSource = null;
    if (prev) {
      console.debug(`[MilkdownSync] source cleared: ${prev}`);
    }
  }

  /**
   * 获取当前同步来源
   */
  get currentSource(): string | null {
    return this.syncSource;
  }

  /**
   * 防抖更新：快速连续更新只触发最后一次回调
   */
  scheduleUpdate(source: string, content: string, callback: (content: string) => void): void {
    this.pendingUpdate = { source, content };
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      const update = this.pendingUpdate;
      if (!update) return;
      this.pendingUpdate = null;
      console.debug(`[MilkdownSync] debounced update from ${update.source}`);
      callback(update.content);
    }, this.debounceMs);
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingUpdate = null;
    this.syncSource = null;
  }
}
