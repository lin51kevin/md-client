import { StorageKeys } from './storage-keys';

export interface Command {
  id: string;
  label: string;
  labelEn?: string;
  shortcut?: string;
  category: 'file' | 'edit' | 'view' | 'format' | 'export' | 'custom';
  action: () => void | Promise<void>;
}

/** Category display labels */
export const CATEGORY_LABELS: Record<string, { zh: string; en: string }> = {
  file:   { zh: '文件', en: 'File' },
  edit:   { zh: '编辑', en: 'Edit' },
  view:   { zh: '视图', en: 'View' },
  format: { zh: '格式', en: 'Format' },
  export: { zh: '导出', en: 'Export' },
  custom: { zh: '自定义', en: 'Custom' },
};

/**
 * Fuzzy search: matches query against command label (Chinese) and labelEn.
 * Supports:
 * - Substring match (case-insensitive)
 * - Initial-letter match (e.g. "xj" → "新建标签页")
 */
function fuzzyMatch(query: string, label: string, labelEn?: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  // Substring match on Chinese label or English label
  if (label.toLowerCase().includes(q)) return true;
  if (labelEn?.toLowerCase().includes(q)) return true;

  // Initial-letter match for Chinese (pinyin-style) and English words
  const letters = q.replace(/[^a-z]/g, '');
  if (!letters) return false;

  // Match initials of each English word
  if (labelEn) {
    const words = labelEn.split(/\s+/);
    const initials = words.map(w => w[0]?.toLowerCase()).join('');
    if (initials.startsWith(letters) || initials.includes(letters)) return true;
  }

  return false;
}

/**
 * Score a match: higher = better. Recent usage boosts score.
 */
function scoreMatch(query: string, cmd: Command, recentIds: Set<string>): number {
  let score = 0;
  const q = query.toLowerCase().trim();

  // Exact match → highest
  if (cmd.label.toLowerCase() === q || cmd.labelEn?.toLowerCase() === q) score += 1000;
  else if (cmd.label.toLowerCase().startsWith(q) || cmd.labelEn?.toLowerCase().startsWith(q)) score += 500;

  // Recently used boost
  if (recentIds.has(cmd.id)) score += 200 + (100 - Array.from(recentIds).indexOf(cmd.id) * 10);

  // Shorter label slightly preferred
  score -= cmd.label.length * 0.1;

  return score;
}

let recentCommands: string[] = [];

/** Get recently used command IDs (most recent first) */
export function getRecentCommandIds(): string[] {
  try {
    const raw = localStorage.getItem(StorageKeys.RECENT_COMMANDS);
    if (raw) recentCommands = JSON.parse(raw);
  } catch { /* ignore */ }
  return recentCommands;
}

/** Record a command execution for recency ranking */
export function recordCommandExecution(commandId: string): void {
  recentCommands = recentCommands.filter(id => id !== commandId);
  recentCommands.unshift(commandId);
  recentCommands = recentCommands.slice(0, 20); // keep max 20
  try {
    localStorage.setItem(StorageKeys.RECENT_COMMANDS, JSON.stringify(recentCommands));
  } catch { /* ignore */ }
}

/** Search commands by fuzzy matching query, sorted by relevance + recency */
export function searchCommands(query: string, allCommands: Command[]): Command[] {
  const recentSet = new Set(getRecentCommandIds());
  const filtered = allCommands.filter(cmd => fuzzyMatch(query, cmd.label, cmd.labelEn));
  return filtered.sort((a, b) => scoreMatch(query, b, recentSet) - scoreMatch(query, a, recentSet));
}
