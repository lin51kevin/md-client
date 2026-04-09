/**
 * F009 — 打字机/专注/全屏模式 Hook
 *
 * 管理四种编辑器焦点模式：
 *   - normal:    默认布局（工具栏 + 标签栏 + 编辑器/预览 + 状态栏）
 *   - typewriter: 打字机模式 — 当前行始终垂直居中，隐藏工具栏和状态栏
 *   - focus:     专注模式 — 仅保留编辑器，暗化其余 UI，高亮当前行
 *   - fullscreen: 全屏模式 — 隐藏 OS 级装饰，占满整个屏幕
 */
import { useState, useCallback, useEffect } from 'react';
import type { FocusMode } from '../types';

interface UseFocusModeOptions {
  /** 模式变更回调（可选，用于通知父组件） */
  onModeChange?: (mode: FocusMode) => void;
}

export function useFocusMode(options: UseFocusModeOptions = {}) {
  const [focusMode, setFocusMode] = useState<FocusMode>('normal');

  const handleSetFocusMode = useCallback((mode: FocusMode) => {
    setFocusMode(mode);
    options.onModeChange?.(mode);

    // 全屏模式使用 Fullscreen API
    if (mode === 'fullscreen') {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      // 从全屏退出时，如果用户按了 ESC 触发的，我们不需要额外处理
      // 但如果是主动切换到其他模式，需要退出全屏
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  }, [options]);

  // 监听 ESC / F11 退出全屏
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && focusMode === 'fullscreen') {
        setFocusMode('normal');
        options.onModeChange?.('normal');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [focusMode, options]);

  /** 是否应隐藏工具栏和标签栏 */
  const isChromeless = focusMode === 'typewriter' || focusMode === 'focus' || focusMode === 'fullscreen';

  /** 是否应隐藏状态栏 */
  const hideStatusBar = focusMode === 'typewriter' || focusMode === 'fullscreen';

  return {
    focusMode,
    setFocusMode: handleSetFocusMode,
    isChromeless,
    hideStatusBar,
  };
}
