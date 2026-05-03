import {
  registerMermaidRenderer,
  unregisterMermaidRenderer,
  getMermaidRenderer,
  isMermaidAvailable,
  type MermaidRenderer,
} from '../../../../lib/markdown/mermaid-bridge';

const mockRenderer: MermaidRenderer = {
  init: async () => {},
  render: async (_id, _code) => ({ svg: '<svg>test</svg>' }),
  reset: () => {},
};

describe('mermaid-bridge', () => {
  afterEach(() => {
    unregisterMermaidRenderer();
  });

  it('should return null when no renderer registered', () => {
    expect(getMermaidRenderer()).toBeNull();
    expect(isMermaidAvailable()).toBe(false);
  });

  it('should return renderer after register', () => {
    registerMermaidRenderer(mockRenderer);
    expect(getMermaidRenderer()).toBe(mockRenderer);
    expect(isMermaidAvailable()).toBe(true);
  });

  it('should return null after unregister', () => {
    registerMermaidRenderer(mockRenderer);
    unregisterMermaidRenderer();
    expect(getMermaidRenderer()).toBeNull();
    expect(isMermaidAvailable()).toBe(false);
  });

  it('isMermaidAvailable should reflect registration state', () => {
    expect(isMermaidAvailable()).toBe(false);
    registerMermaidRenderer(mockRenderer);
    expect(isMermaidAvailable()).toBe(true);
    unregisterMermaidRenderer();
    expect(isMermaidAvailable()).toBe(false);
  });
});
