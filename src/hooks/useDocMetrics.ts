import { useState, useEffect, useMemo } from 'react';
import { extractToc, type TocEntry } from '../lib/toc';
import { countWords } from '../lib/word-count';

export type { TocEntry };

export function useDocMetrics(doc: string, activeTabId: string) {
  const [debouncedDoc, setDebouncedDoc] = useState(doc);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedDoc(doc), 300);
    return () => clearTimeout(id);
  // activeTabId 切换时立即同步,避免旧标签页数据延迟显示
  }, [doc, activeTabId]);

  const tocEntries = useMemo(() => extractToc(debouncedDoc), [debouncedDoc]);
  const wordCount = useMemo(() => countWords(debouncedDoc).words, [debouncedDoc]);

  return { debouncedDoc, tocEntries, wordCount };
}
