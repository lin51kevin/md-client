export type EditScopeMode = 'selection' | 'document' | 'tab' | 'workspace';

export function getEffectiveScope(scope: EditScopeMode, hasSelection: boolean): EditScopeMode {
  if (scope === 'selection' && !hasSelection) {
    return 'document';
  }
  return scope;
}

export function isInlineEditableScope(scope: EditScopeMode): boolean {
  return scope !== 'workspace';
}
