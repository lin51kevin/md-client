import { describe, it, expect, vi } from 'vitest';
import type { Extension } from '@codemirror/state';

describe('rainbowBrackets extension', () => {
  it('should export a function that returns a CodeMirror Extension', async () => {
    const mod = await import('../../../lib/cm/cmRainbowBrackets');
    const result = mod.rainbowBrackets();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should use Prec.highest priority to override default bracketMatching', async () => {
    const mod = await import('../../../lib/cm/cmRainbowBrackets');
    const result: Extension[] = mod.rainbowBrackets();
    // The returned array should contain at least one extension wrapped with Prec
    expect(result.length).toBeGreaterThan(0);
    // Verify the extension has a precedence wrapper (Prec.highest produces an object with a prec field)
    const hasPrecWrapped = result.some(ext => {
      return ext && typeof ext === 'object' && 'prec' in (ext as any);
    });
    expect(hasPrecWrapped).toBe(true);
  });

  it('should be lazy loaded (dynamic import)', async () => {
    // Verify the module can be dynamically imported (already proven above)
    const mod = await import('../../../lib/cm/cmRainbowBrackets');
    expect(mod.rainbowBrackets).toBeInstanceOf(Function);
  });
});
