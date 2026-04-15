/**
 * useCodeBlockFold — fold/unfold code blocks in Milkdown preview
 *
 * Folded state is persisted in localStorage keyed by a hash of the
 * block's language + first line, so it survives across sessions.
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'marklite-codeblock-fold';

interface FoldState {
  collapsed: Set<string>;
}

/** Build a stable per-block id from language + first line */
function blockId(lang: string, firstLine: string): string {
  // Simple hash so we can key localStorage
  let h = 0;
  const str = `${lang}|${firstLine}`;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return `cb-${Math.abs(h).toString(36)}`;
}

function loadState(): FoldState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { collapsed: new Set() };
  } catch {
    return { collapsed: new Set() };
  }
}

function saveState(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function useCodeBlockFold() {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadState().collapsed);

  const isCollapsed = useCallback(
    (id: string) => collapsed.has(id),
    [collapsed]
  );

  const toggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveState(next);
      return next;
    });
  }, []);

  // Returns the line count from the code content
  const lineCount = useCallback((code: string) => {
    return code.split('\n').length;
  }, []);

  // Returns a preview string when collapsed
  const previewText = useCallback(
    (code: string, lang: string) => {
      const lines = code.split('\n');
      const n = lines.length;
      return `\`\`\`${lang} [${n} lines…]`;
    },
    []
  );

  return { isCollapsed, toggle, lineCount, previewText, blockId };
}
