export type EditScopeMode = 'selection' | 'cursor' | 'document' | 'tab' | 'workspace';

export function getEffectiveScope(scope: EditScopeMode, hasSelection: boolean): EditScopeMode {
  if (scope === 'selection' && !hasSelection) {
    return 'cursor';
  }
  return scope;
}

export function isInlineEditableScope(scope: EditScopeMode): boolean {
  return scope !== 'workspace';
}
