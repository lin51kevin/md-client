/**
 * F003 — Vim 模式状态管理
 * 
 * 管理 normal/insert/visual 三种模式的切换和事件通知
 */

export type VimMode = 'normal' | 'insert' | 'visual';

export class VimModeManager {
  private mode: VimMode = 'normal';
  private listeners: Array<(mode: VimMode) => void> = [];

  getMode(): VimMode {
    return this.mode;
  }

  setMode(newMode: VimMode): void {
    if (this.mode === newMode) return;
    this.mode = newMode;
    this.listeners.forEach(fn => fn(newMode));
  }

  onModeChange(fn: (mode: VimMode) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  /** 模拟按键处理，返回新模式 */
  handleKey(key: string, currentMode?: VimMode): VimMode {
    const mode = currentMode ?? this.mode;

    switch (mode) {
      case 'normal':
        if (['i', 'I', 'a', 'A', 'o', 'O', 's', 'S', 'c', 'C'].includes(key)) {
          this.setMode('insert');
          return 'insert';
        }
        if (['v', 'V'].includes(key)) {
          this.setMode('visual');
          return 'visual';
        }
        return 'normal';

      case 'insert':
        if (key === 'Escape') {
          this.setMode('normal');
          return 'normal';
        }
        return 'insert';

      case 'visual':
        if (key === 'Escape') {
          this.setMode('normal');
          return 'normal';
        }
        if (['y', 'd', 'x', 'p'].includes(key)) {
          this.setMode('normal');
          return 'normal';
        }
        return 'visual';

      default:
        return mode;
    }
  }

  reset(): void {
    this.setMode('normal');
  }
}
