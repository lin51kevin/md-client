export type EditScopeMode = 'selection' | 'cursor' | 'document' | 'tab' | 'workspace' | 'section';

/** Selection-oriented actions that benefit from document-level fallback. */
const SELECTION_PREFERRED_ACTIONS = new Set([
  'edit', 'polish', 'rewrite', 'format', 'translate', 'delete',
]);

export interface ScopeResolution {
  scope: EditScopeMode;
  /** True if the scope was downgraded because no text was selected. */
  downgraded: boolean;
}

/**
 * Resolve the effective scope. If the intent targets 'selection' but nothing
 * is selected, fall back to 'document' for selection-oriented actions (so the
 * AI still produces actionable edits) and to 'cursor' for everything else.
 */
export function getEffectiveScope(
  scope: EditScopeMode,
  hasSelection: boolean,
  action?: string,
): ScopeResolution {
  if (scope === 'selection' && !hasSelection) {
    if (action && SELECTION_PREFERRED_ACTIONS.has(action)) {
      // delete/edit without selection → prefer section scope (cursor's heading section)
      if (action === 'delete' || action === 'edit') {
        return { scope: 'section', downgraded: true };
      }
      return { scope: 'document', downgraded: true };
    }
    return { scope: 'cursor', downgraded: true };
  }
  return { scope, downgraded: false };
}

export function isInlineEditableScope(scope: EditScopeMode): boolean {
  return scope !== 'workspace';
}