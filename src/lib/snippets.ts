/**
 * MarkLite Snippet/Template System
 *
 * Supports variable placeholders like ${date}, ${cursor}, ${title|default}
 */

export interface Snippet {
  id: string;           // UUID
  name: string;         // 片段名称
  content: string;      // 片段内容（含变量占位符）
  description?: string; // 描述
  createdAt: number;    // 创建时间戳
}

export interface SnippetVariable {
  name: string;
  label: string;
  defaultValue: string | (() => string);
}

/** Pre-defined variables that auto-resolve on insert */
export const PREDEFINED_VARIABLES: SnippetVariable[] = [
  { name: 'date', label: '日期', defaultValue: () => new Date().toLocaleDateString('zh-CN') },
  { name: 'time', label: '时间', defaultValue: () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) },
  { name: 'datetime', label: '日期时间', defaultValue: () => new Date().toLocaleString('zh-CN') },
  { name: 'filename', label: '文件名', defaultValue: '' },
  { name: 'cursor', label: '光标位置', defaultValue: '' },
];

import { StorageKeys } from './storage-keys';

export const SNIPPETS_STORAGE_KEY = StorageKeys.SNIPPETS;

/** Generate a simple unique ID */
export function generateSnippetId(): string {
  return 'snip-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/** Load snippets from localStorage */
export function getSnippets(): Snippet[] {
  try {
    const stored = localStorage.getItem(SNIPPETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : getDefaultSnippets();
  } catch {
    return getDefaultSnippets();
  }
}

/** Persist snippets to localStorage. Returns true on success, false on quota exceeded. */
export function saveSnippets(snippets: Snippet[]): boolean {
  try {
    const serialized = JSON.stringify(snippets);
    // localStorage typically has ~5MB limit; guard at 4.5MB to leave buffer
    if (serialized.length > 4.5 * 1024 * 1024) {
      return false;
    }
    localStorage.setItem(SNIPPETS_STORAGE_KEY, serialized);
    return true;
  } catch {
    // QuotaExceededError or other storage errors — caller checks return value
    return false;
  }
}

/** Factory default snippets */
export function getDefaultSnippets(): Snippet[] {
  return [
    {
      id: 'default-meeting',
      name: '会议纪要',
      content: '# ${title}\n\n日期: ${date}\n时间: ${time}\n参会人: \n\n---\n\n## 议程\n\n- \n\n## 讨论\n\n- \n\n## 行动项\n\n- [ ] \n\n## 下次会议\n\n${cursor}',
      description: '标准会议纪要模板',
      createdAt: Date.now(),
    },
    {
      id: 'default-codeblock',
      name: '代码块',
      content: '```${language|javascript}\n${cursor}\n```',
      description: '带语言选择的代码块',
      createdAt: Date.now(),
    },
    {
      id: 'default-dailynote',
      name: '日记',
      content: '# ${date} 日记\n\n## 今日总结\n\n${cursor}\n\n## 明日计划\n\n- \n',
      description: '每日日记模板',
      createdAt: Date.now(),
    },
  ];
}

/**
 * Resolve snippet content: replace variables with actual values.
 * Returns the resolved text and where cursor should be placed.
 */
/**
 * Resolve snippet content: replace variables with actual values.
 * Uses a placeholder to correctly track ${cursor} position after all other
 * variable substitutions (which may change text length).
 */
export function resolveSnippet(
  content: string,
  context: { filename?: string } = {},
): { text: string; cursorPosition: number | null } {
  // [B2 FIX] Use a sentinel placeholder so that cursor position is computed
  // AFTER all other variable substitutions — preventing offset errors when
  // ${date}/${time} etc. expand to different-length strings.
  // U+FFFD (REPLACEMENT CHARACTER) is used as delimiters to avoid conflicts
  // with null bytes or any user content.
  const CURSOR_SENTINEL = '\uFFFDMARKLITE_CURSOR\uFFFD';
  let text = content.replace(/\$\{cursor\}/g, CURSOR_SENTINEL);

  // Replace predefined variables: ${name} or ${name|fallback}
  for (const variable of PREDEFINED_VARIABLES) {
    if (variable.name === 'cursor') continue; // handled above via sentinel

    const pattern = new RegExp(`\\$\\{${variable.name}(?:\\|([^}]*))?\\}`, 'g');
    text = text.replace(pattern, (_match, fallback) => {
      if (variable.name === 'filename') {
        return context.filename || fallback || '';
      }
      const fn = variable.defaultValue;
      return typeof fn === 'function' ? fn() : (fallback || String(fn));
    });
  }

  // Now that all variables are resolved, find the sentinel and remove it
  const cursorPosition = text.indexOf(CURSOR_SENTINEL);
  const finalText = cursorPosition !== -1
    ? text.slice(0, cursorPosition) + text.slice(cursorPosition + CURSOR_SENTINEL.length)
    : text;

  return {
    text: finalText,
    cursorPosition: cursorPosition !== -1 ? cursorPosition : null,
  };
}
