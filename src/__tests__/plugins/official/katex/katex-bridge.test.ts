import {
  registerKatexPlugin,
  unregisterKatexPlugin,
  getKatexPlugin,
  isKatexAvailable,
  ensureKatexCSS,
} from '../../../../lib/markdown/katex-bridge';

describe('katex-bridge', () => {
  beforeEach(() => {
    unregisterKatexPlugin();
  });

  it('should return null when no plugin registered', () => {
    expect(getKatexPlugin()).toBeNull();
    expect(isKatexAvailable()).toBe(false);
  });

  it('should return plugin after register', () => {
    const mockRemark = { name: 'remark-math' };
    const mockRehype = { name: 'rehype-katex' };
    registerKatexPlugin({ remarkMath: mockRemark, rehypeKatex: mockRehype });

    const plugin = getKatexPlugin();
    expect(plugin).not.toBeNull();
    expect(plugin!.remarkMath).toBe(mockRemark);
    expect(plugin!.rehypeKatex).toBe(mockRehype);
    expect(isKatexAvailable()).toBe(true);
  });

  it('should return null after unregister', () => {
    registerKatexPlugin({ remarkMath: {}, rehypeKatex: {} });
    expect(getKatexPlugin()).not.toBeNull();

    unregisterKatexPlugin();
    expect(getKatexPlugin()).toBeNull();
    expect(isKatexAvailable()).toBe(false);
  });

  it('isKatexAvailable should reflect registration state', () => {
    expect(isKatexAvailable()).toBe(false);

    registerKatexPlugin({ remarkMath: {}, rehypeKatex: {} });
    expect(isKatexAvailable()).toBe(true);

    unregisterKatexPlugin();
    expect(isKatexAvailable()).toBe(false);
  });

  it('ensureKatexCSS should be callable multiple times without error', () => {
    // First call should succeed
    expect(() => ensureKatexCSS()).not.toThrow();

    // Second call should be a no-op (already loaded)
    expect(() => ensureKatexCSS()).not.toThrow();
  });
});
