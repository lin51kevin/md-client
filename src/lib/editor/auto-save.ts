/**
 * F004 — 自动保存
 * 
 * 防抖自动保存管理器，支持：
 * - 可配置延迟时间
 * - 内容不变跳过保存
 * - 立即保存（手动 Ctrl+S）
 * - 取消和销毁
 */

export interface AutoSaveOptions {
  /** 防抖延迟（毫秒） */
  delay: number;
  /** 保存回调 */
  onSave: (content: string) => void | Promise<void>;
  /** 内容比较函数（可选，用于判断是否需要保存） */
  isEqual?: (a: string, b: string) => boolean;
}

export interface AutoSaveInstance {
  /** 调度一次延迟保存（会取消之前的未执行保存） */
  schedule: (content: string) => void;
  /** 立即保存（忽略防抖，如手动 Ctrl+S） */
  saveNow: (content: string) => Promise<void>;
  /** 取消待执行的保存 */
  cancel: () => void;
  /** 销毁（清除定时器） */
  dispose: () => void;
  /** 是否正在保存中 */
  readonly isSaving: boolean;
}

/**
 * 创建自动保存管理器
 */
export function createAutoSave(options: AutoSaveOptions): AutoSaveInstance {
  const { delay, onSave, isEqual = (a, b) => a === b } = options;
  
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSavedContent: string | null = null;
  let pendingContent: string | null = null;
  let isSaving = false;
  let disposed = false;

  function schedule(content: string): void {
    if (disposed) return;
    
    if (lastSavedContent !== null && isEqual(content, lastSavedContent)) {
      return;
    }

    pendingContent = content;
    
    if (timer !== null) {
      clearTimeout(timer);
    }
    
    timer = setTimeout(async () => {
      if (disposed || pendingContent === null) return;
      if (isEqual(pendingContent, lastSavedContent ?? '')) return;
      
      const toSave = pendingContent;
      isSaving = true;
      try {
        await onSave(toSave);
        if (!disposed) lastSavedContent = toSave;
      } finally {
        isSaving = false;
      }
    }, delay);
  }

  async function saveNow(content: string): Promise<void> {
    if (disposed) return;
    
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    
    if (!isEqual(content, lastSavedContent ?? '')) {
      isSaving = true;
      try {
        await onSave(content);
        lastSavedContent = content;
      } finally {
        isSaving = false;
      }
    }
  }

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pendingContent = null;
  }

  function dispose(): void {
    cancel();
    disposed = true;
    lastSavedContent = null;
  }

  return { schedule, saveNow, cancel, dispose, get isSaving() { return isSaving; } };
}
