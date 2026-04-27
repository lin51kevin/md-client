import { describe, expect, it } from 'vitest';
import { installHtmlImportDomGlobals } from '../../workers/html-import-dom';

describe('html-import-dom', () => {
  it('installs DOMParser and createHTMLDocument for worker runtimes', () => {
    const target: Record<string, unknown> = {};

    installHtmlImportDomGlobals(target);

    expect(target.DOMParser).toBeTypeOf('function');
    expect(target.document).toBeDefined();
    expect(target.window).toBe(target);

    const implementation = (target.document as Document).implementation as
      | { createHTMLDocument?: (title?: string) => Document }
      | undefined;

    expect(implementation?.createHTMLDocument).toBeTypeOf('function');

    const detached = implementation?.createHTMLDocument?.('Imported');
    expect(detached?.querySelector('title')?.textContent).toBe('Imported');
  });
});
