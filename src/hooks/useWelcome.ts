/**
 * useWelcome — 欢迎页状态管理
 *
 * 提取自 App.tsx，集中管理欢迎页的显示/隐藏逻辑和 localStorage 持久化。
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'marklite-welcome-dismissed';

export function useWelcome() {
  const [welcomeDismissed, setWelcomeDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissWelcome = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* ignore quota errors */
    }
    setWelcomeDismissed(true);
  }, []);

  const handleShowWelcome = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setWelcomeDismissed(false);
  }, []);

  return { welcomeDismissed, handleDismissWelcome, handleShowWelcome };
}
