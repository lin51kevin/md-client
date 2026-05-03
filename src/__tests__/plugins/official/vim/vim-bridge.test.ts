import {
  registerVimExtension,
  unregisterVimExtension,
  getVimExtension,
  isVimAvailable,
} from '../../../../lib/cm/vim-bridge';

describe('vim-bridge', () => {
  const mockExt = { some: 'extension' } as unknown as import('@codemirror/state').Extension;

  afterEach(() => {
    unregisterVimExtension();
  });

  it('should return null when no extension registered', () => {
    expect(getVimExtension()).toBeNull();
    expect(isVimAvailable()).toBe(false);
  });

  it('should return extension after register', () => {
    registerVimExtension(mockExt);
    expect(getVimExtension()).toBe(mockExt);
    expect(isVimAvailable()).toBe(true);
  });

  it('should return null after unregister', () => {
    registerVimExtension(mockExt);
    unregisterVimExtension();
    expect(getVimExtension()).toBeNull();
    expect(isVimAvailable()).toBe(false);
  });

  it('isVimAvailable should reflect registration state', () => {
    expect(isVimAvailable()).toBe(false);
    registerVimExtension(mockExt);
    expect(isVimAvailable()).toBe(true);
    unregisterVimExtension();
    expect(isVimAvailable()).toBe(false);
  });
});
