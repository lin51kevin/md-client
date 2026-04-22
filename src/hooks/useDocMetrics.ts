import { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import { extractToc, type TocEntry } from '../lib/markdown';
import { countWords } from '../lib/utils';

export type { TocEntry };

export function useDocMetrics(doc: string, activeTabId: string) {
  const [debouncedDoc, setDebouncedDoc] = useState(doc);
  const [, startTransition] = useTransition();
  const [prevTabId, setPrevTabId] = useState(activeTabId);

  // Keep a ref to the latest doc so we can sync immediately on tab switch
  const docRef = useRef(doc);
  docRef.current = doc;

  // Synchronously update debouncedDoc when the active tab changes to avoid
  // rendering one frame with the previous tab's content (flash).
  if (prevTabId !== activeTabId) {
    setPrevTabId(activeTabId);
    setDebouncedDoc(doc);
  }

  useEffect(() => {
    // Debounce further edits within the same tab
    const id = setTimeout(() => {
      startTransition(() => setDebouncedDoc(docRef.current));
    }, 300);
    return () => clearTimeout(id);
  }, [doc, activeTabId]);

  const tocEntries = useMemo(() => {
    if (debouncedDoc.length > 200_000) {
      return extractToc(debouncedDoc.slice(0, 200_000));
    }
    return extractToc(debouncedDoc);
  }, [debouncedDoc]);

  const wordCount = useMemo(() => {
    const docForCount = debouncedDoc.length > 500_000
      ? debouncedDoc.slice(0, 500_000)
      : debouncedDoc;
    return countWords(docForCount).words;
  }, [debouncedDoc]);

  return { debouncedDoc, tocEntries, wordCount };
}
