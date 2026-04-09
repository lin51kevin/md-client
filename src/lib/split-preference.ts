/**
 * F013 — 分栏比例记忆
 *
 * 保存用户拖拽调整的分栏宽度比例，
 * 下次打开时自动恢复。
 */

const STORAGE_KEY = 'md-client-split-sizes';
const DEFAULT_SIZES = [50, 50] as const;

/**
 * 从 localStorage 读取保存的分栏比例
 * @returns [editorRatio, previewRatio]，范围 [10, 90]
 */
export function getSavedSplitSizes(): [number, number] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_SIZES];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed) || parsed.length !== 2) return [...DEFAULT_SIZES];
    const [a, b] = parsed.map(Number);
    // 合法性校验：两者和应为 100，且各自在 [10, 90] 范围内
    if (!Number.isFinite(a) || !Number.isFinite(b)) return [...DEFAULT_SIZES];
    if (Math.abs(a + b - 100) > 0.5) return [...DEFAULT_SIZES];
    if (a < 10 || a > 90) return [...DEFAULT_SIZES];
    return [a, 100 - a];
  } catch {
    return [...DEFAULT_SIZES];
  }
}

/**
 * 保存分栏比例到 localStorage
 */
export function saveSplitSizes(sizes: readonly [number, number]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  } catch { /* ignore */ }
}
