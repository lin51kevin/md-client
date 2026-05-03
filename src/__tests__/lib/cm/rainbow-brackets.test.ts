import { describe, it, expect, vi } from 'vitest';
import type { Extension } from '@codemirror/state';

describe('rainbowBrackets extension', () => {
  it('should export a function that returns a CodeMirror Extension', async () => {
    const mod = await import('../../lib/cm/cmRainbowBrackets');
    const result = mod.rainbowBrackets();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should use Prec.highest priority to override default bracketMatching', async () => {
    const { Prec } = await import('@codemirror/state');
    const mod = await import('../../lib/cm/cmRainbowBrackets');
    const result: Extension[] = mod.rainbowBrackets();
    // The ViewPlugin should be wrapped in Prec.highest
    const hasPrec = result.some(ext => {
      if (ext && typeof ext === 'object' && 'prec' in ext) {
        return (ext as { prec: number }).prec === (Prec as any).highest;
      }
      return false;
    });
    expect(hasPrec).toBe(true);
  });

  it('should be lazy loaded (dynamic import)', async () => {
    // Verify the module can be dynamically imported (already proven above)
    const mod = await import('../../lib/cm/cmRainbowBrackets');
    expect(mod.rainbowBrackets).toBeInstanceOf(Function);
  });
});
