import type { EditAction } from './providers/types';

export interface ActionValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateActionAgainstCurrentContent(
  action: EditAction,
  currentContent: string,
): ActionValidationResult {
  if (action.from < 0 || action.to < action.from || action.to > currentContent.length) {
    return { valid: false, reason: 'stale: range out of bounds' };
  }

  if (action.type === 'insert') {
    return { valid: true };
  }

  const currentSlice = currentContent.slice(action.from, action.to);
  if (currentSlice !== action.originalText) {
    const searchStart = Math.max(0, action.from - 500);
    const searchEnd = Math.min(currentContent.length, action.to + 500);
    const nearRegion = currentContent.slice(searchStart, searchEnd);
    const relocatedIdx = nearRegion.indexOf(action.originalText);
    if (relocatedIdx >= 0) {
      const actualOffset = searchStart + relocatedIdx;
      return {
        valid: false,
        reason: `stale: text moved from ${action.from} to ${actualOffset}`,
      };
    }
    return { valid: false, reason: 'stale: source text changed' };
  }

  return { valid: true };
}
