import { describe, expect, it } from 'vitest';
import { getEffectiveScope, type EditScopeMode } from '../../../plugins/official/ai-copilot/src/edit-scope';

describe('getEffectiveScope', () => {
  it('keeps selection when selection exists', () => {
    expect(getEffectiveScope('selection', true).scope).toBe('selection');
    expect(getEffectiveScope('selection', true).downgraded).toBe(false);
  });

  it('falls back to document for polish/rewrite/format/translate without selection', () => {
    expect(getEffectiveScope('selection', false, 'polish').scope).toBe('document');
    expect(getEffectiveScope('selection', false, 'polish').downgraded).toBe(true);
    expect(getEffectiveScope('selection', false, 'format').scope).toBe('document');
    expect(getEffectiveScope('selection', false, 'translate').scope).toBe('document');
  });

  it('falls back to cursor for other actions without selection', () => {
    expect(getEffectiveScope('selection', false).scope).toBe('cursor');
    expect(getEffectiveScope('selection', false).downgraded).toBe(true);
    expect(getEffectiveScope('selection', false, 'explain').scope).toBe('cursor');
  });

  it('keeps cursor scope regardless of selection', () => {
    expect(getEffectiveScope('cursor', false).scope).toBe('cursor');
    expect(getEffectiveScope('cursor', true).scope).toBe('cursor');
  });

  it('keeps document scope', () => {
    expect(getEffectiveScope('document', false).scope).toBe('document');
  });

  it('keeps tab scope', () => {
    expect(getEffectiveScope('tab', false).scope).toBe('tab');
  });

  it('keeps workspace scope', () => {
    expect(getEffectiveScope('workspace', false).scope).toBe('workspace');
  });

  it('accepts all legal scope values without downgrading', () => {
    const all: EditScopeMode[] = ['selection', 'cursor', 'document', 'tab', 'workspace'];
    expect(all.map((s) => getEffectiveScope(s, true).scope)).toEqual(all);
    expect(all.map((s) => getEffectiveScope(s, true).downgraded)).toEqual(all.map(() => false));
  });
});
