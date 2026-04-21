/**
 * DOM bootstrap for the HTML import Worker.
 *
 * Turndown inspects global DOM APIs at module-evaluation time. In a Worker we
 * must install a DOM-like environment before importing the conversion module.
 */
import { DOMParser, parseHTML } from 'linkedom';

type DomGlobalsTarget = Record<string, unknown>;

export function installHtmlImportDomGlobals(
  target: DomGlobalsTarget = globalThis as unknown as DomGlobalsTarget,
): void {
  const { document } = parseHTML('<!doctype html><html><body></body></html>');

  target.document = document;
  target.DOMParser = DOMParser;
  target.window = target;

  if (!document.implementation) {
    Object.defineProperty(document, 'implementation', {
      configurable: true,
      enumerable: false,
      writable: false,
      value: {
        createHTMLDocument(title = '') {
          return new DOMParser().parseFromString(
            `<!doctype html><html><head><title>${title}</title></head><body></body></html>`,
            'text/html',
          );
        },
      },
    });
  }
}
