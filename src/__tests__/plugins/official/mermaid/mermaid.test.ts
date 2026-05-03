import { renderMermaid, resetMermaidInit, initMermaid, reinitMermaid } from '../../../../lib/markdown/mermaid';
import { isMermaidAvailable, registerMermaidRenderer, unregisterMermaidRenderer, type MermaidRenderer } from '../../../../lib/markdown/mermaid-bridge';

const mockRenderer: MermaidRenderer = {
  init: async () => {},
  render: async (_id, code) => ({ svg: `<svg>${code}</svg>` }),
  reset: () => {},
};

describe('Mermaid degradation', () => {
  afterEach(() => {
    resetMermaidInit();
    unregisterMermaidRenderer();
  });

  it('should pass through code blocks when mermaid unavailable', async () => {
    expect(isMermaidAvailable()).toBe(false);
    const input = '```mermaid\ngraph LR\n  A --> B\n```';
    const result = await renderMermaid(input);
    // Without a renderer, the text should be returned unchanged
    expect(result).toBe(input);
  });

  it('should return text unchanged when no mermaid blocks', async () => {
    const result = await renderMermaid('hello world');
    expect(result).toBe('hello world');
  });

  it('should return text unchanged when no mermaid keyword', async () => {
    const result = await renderMermaid('```js\nconsole.log("hi")\n```');
    expect(result).toBe('```js\nconsole.log("hi")\n```');
  });
});

describe('Mermaid with registered renderer', () => {
  beforeEach(() => {
    registerMermaidRenderer(mockRenderer);
  });

  afterEach(() => {
    resetMermaidInit();
    unregisterMermaidRenderer();
  });

  it('should use registered renderer when available', async () => {
    expect(isMermaidAvailable()).toBe(true);
    const input = '```mermaid\ngraph LR\n  A --> B\n```';
    const result = await renderMermaid(input);
    // Should contain the SVG output from the mock renderer
    expect(result).toContain('<svg>');
    expect(result).not.toContain('```mermaid');
  });

  it('should cache repeated identical diagrams', async () => {
    const input = '```mermaid\ngraph LR\n  A --> B\n```';
    const result1 = await renderMermaid(input);
    const result2 = await renderMermaid(input);
    expect(result1).toBe(result2);
  });

  it('initMermaid should not throw without renderer', async () => {
    unregisterMermaidRenderer();
    await expect(initMermaid()).resolves.toBeUndefined();
  });

  it('reinitMermaid should not throw', () => {
    expect(() => reinitMermaid()).not.toThrow();
  });
});
