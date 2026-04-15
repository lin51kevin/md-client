/**
 * F009 — 打字机/专注/全屏模式 Hook
 *
 * 管理四种编辑器焦点模式：
 *   - normal:    默认布局（工具栏 + 标签栏 + 编辑器/预览 + 状态栏）
 *   - typewriter: 打字机模式 — 当前行始终垂直居中，隐藏工具栏和状态栏
 *   - focus:     专注模式 — 仅保留编辑器，暗化其余 UI，高亮当前行
 *   - fullscreen: 全屏模式 — 隐藏 OS 级装饰，占满整个屏幕
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { FocusMode } from '../types';
import type { TypewriterOptions } from './useTypewriterOptions';

interface UseFocusModeOptions {
  onModeChange?: (mode: FocusMode) => void;
  typewriterOptions?: TypewriterOptions;
}

export function useFocusMode(options: UseFocusModeOptions = {}) {
  const [focusMode, setFocusMode] = useState<FocusMode>('normal');

  // Keep onModeChange ref fresh to avoid stale-closure issues in effects
  const onModeChangeRef = useRef(options.onModeChange);
  useEffect(() => { onModeChangeRef.current = options.onModeChange; });

  const handleSetFocusMode = useCallback((mode: FocusMode) => {
    setFocusMode(mode);
    onModeChangeRef.current?.(mode);

    if (mode === 'fullscreen') {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  }, []);

  // 监听 ESC / F11 退出全屏
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && focusMode === 'fullscreen') {
        setFocusMode('normal');
        onModeChangeRef.current?.('normal');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [focusMode]);

  const isChromeless = focusMode === 'typewriter' || focusMode === 'focus' || focusMode === 'fullscreen';
  const hideStatusBar = focusMode === 'typewriter' || focusMode === 'fullscreen';

  return { focusMode, setFocusMode: handleSetFocusMode, isChromeless, hideStatusBar };
}
