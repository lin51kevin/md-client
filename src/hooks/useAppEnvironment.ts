/**
 * useAppEnvironment — aggregates application environment hooks for AppShell.
 *
 * Combines window initialization, app lifecycle, and update notification.
 * (useAppLayout and useAppUIState remain independent as they have no external deps.)
 */
import type { Tab } from '../types';
import type { ThemeName } from '../lib/theme';
import type { TranslationKey } from '../i18n';
import { useWindowInit } from './useWindowInit';
import { useAppLifecycle } from './useAppLifecycle';
import { useUpdateNotification } from './useUpdateNotification';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export interface UseAppEnvironmentParams {
  isTauri: boolean;
  theme: ThemeName;
  autoUpdateCheck: boolean;
  updateCheckFrequency: 'startup' | '24h';
  isRestoringSession: boolean;
  openFileWithContent: (filePath: string, content: string) => void;
  openFolderAsRoot?: (folderPath: string) => void;
  tabsRef: React.MutableRefObject<Tab[]>;
  t: TFn;
}

export function useAppEnvironment({
  isTauri, theme, autoUpdateCheck, updateCheckFrequency,
  isRestoringSession, openFileWithContent, openFolderAsRoot, tabsRef, t,
}: UseAppEnvironmentParams) {
  useWindowInit(isTauri, theme);

  useAppLifecycle({
    isTauri, isRestoringSession, openFileWithContent, openFolderAsRoot, tabsRef, t,
  });

  const updateResult = useUpdateNotification({
    enabled: autoUpdateCheck,
    checkFrequency: updateCheckFrequency,
  });

  return updateResult;
}
