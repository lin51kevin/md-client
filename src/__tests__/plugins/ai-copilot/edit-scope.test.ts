import { describe, expect, it } from 'vitest';
import { getEffectiveScope, type EditScopeMode } from '../../../plugins/official/ai-copilot/src/edit-scope';

describe('getEffectiveScope', () => {
  it('keeps selection when selection exists', () => {
    expect(getEffectiveScope('selection', true)).toBe('selection');
  });

  it('falls back to document when selection missing', () => {
    expect(getEffectiveScope('selection', false)).toBe('document');
  });

  it('keeps document scope', () => {
    expect(getEffectiveScope('document', false)).toBe('document');
  });

  it('keeps tab scope', () => {
    expect(getEffectiveScope('tab', false)).toBe('tab');
  });

  it('keeps workspace scope', () => {
    expect(getEffectiveScope('workspace', false)).toBe('workspace');
  });

  it('accepts all legal scope values', () => {
    const all: EditScopeMode[] = ['selection', 'document', 'tab', 'workspace'];
    expect(all.map((s) => getEffectiveScope(s, true))).toEqual(all);
  });
});
