import { describe, it, expect } from 'vitest';

/**
 * Verifies that key high-frequency components are wrapped with React.memo
 * to prevent unnecessary re-renders when parent state changes.
 */
describe('React.memo optimization', () => {
  it('Toolbar is memoized', async () => {
    const mod = await import('../../components/toolbar/Toolbar');
    // React.memo wraps the component — the export should have $$typeof or be a memo object
    expect(mod.Toolbar).toHaveProperty('type');
    expect((mod.Toolbar as any).$$typeof?.toString()).toBe('Symbol(react.memo)');
  });

  it('TabBar is memoized', async () => {
    const mod = await import('../../components/toolbar/TabBar');
    expect((mod.TabBar as any).$$typeof?.toString()).toBe('Symbol(react.memo)');
  });

  it('StatusBar is memoized', async () => {
    const mod = await import('../../components/toolbar/StatusBar');
    expect((mod.StatusBar as any).$$typeof?.toString()).toBe('Symbol(react.memo)');
  });

  it('ActivityBar is memoized', async () => {
    const mod = await import('../../components/editor/ActivityBar');
    expect((mod.ActivityBar as any).$$typeof?.toString()).toBe('Symbol(react.memo)');
  });
});
