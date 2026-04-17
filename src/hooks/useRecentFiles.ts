import { useState, useCallback } from 'react';
import { getRecentFiles, clearRecentFiles, removeRecentFile, type RecentFile } from '../lib/file';

interface UseRecentFilesOptions {
  openFileInTab: (filePath: string) => Promise<void>;
}

export function useRecentFiles({ openFileInTab }: UseRecentFilesOptions) {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(getRecentFiles());

  const refreshRecentFiles = useCallback(() => {
    setRecentFiles(getRecentFiles());
  }, []);

  const handleOpenRecent = useCallback(async (filePath: string) => {
    await openFileInTab(filePath);
    setRecentFiles(getRecentFiles());
  }, [openFileInTab]);

  const handleClearRecent = useCallback(() => {
    clearRecentFiles();
    setRecentFiles([]);
  }, []);

  const handleRemoveRecent = useCallback((filePath: string) => {
    const updated = removeRecentFile(filePath);
    setRecentFiles(updated);
  }, []);

  return {
    recentFiles, refreshRecentFiles,
    handleOpenRecent, handleClearRecent, handleRemoveRecent,
  };
}
