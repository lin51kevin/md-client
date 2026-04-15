import { describe, it, expect } from 'vitest';
import { rehypeFilterInvalidElements } from '../../lib/rehypeFilterInvalidElements';
import { rehypeWikiLinks } from '../../lib/rehype-wikilinks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal HAST tree and run the plugin on it. */
function runPlugin(plugin: () => (tree: any) => void, root: any): any {
  plugin()(root);
  return root;
}

function makeRoot(...children: any[]): any {
  return { type: 'root', children };
}

function makeElement(tagName: string, children: any[] = [], properties: any = {}): any {
  return { type: 'element', tagName, properties, children };
}

function makeText(value: string): any {
  return { type: 'text', value };
}

function makeWikiLink(value: string): any {
  return { type: 'wikiLink', value, data: {} };
}

// ─── rehypeFilterInvalidElements ──────────────────────────────────────────────

describe('rehypeFilterInvalidElements', () => {
  it('removes an element with a numeric-starting tag name (e.g. 300-306)', () => {
    const root = makeRoot(makeElement('300-306', [makeText('content')]));
    runPlugin(rehypeFilterInvalidElements, root);
    // The invalid element is replaced by its children (text node hoisted)
    expect(root.children.find((c: any) => c.type === 'element' && c.tagName === '300-306')).toBeUndefined();
  });

  it('hoists children of stripped element into parent', () => {
    const child = makeText('inner text');
    const root = makeRoot(makeElement('400-999', [child]));
    runPlugin(rehypeFilterInvalidElements, root);
    expect(root.children).toContainEqual(child);
  });

  it('keeps valid tag names untouched', () => {
    const div = makeElement('div', [makeText('hello')]);
    const root = makeRoot(div);
    runPlugin(rehypeFilterInvalidElements, root);
    expect(root.children[0]).toBe(div);
  });

  it('keeps custom element names (letter-starting, hyphenated)', () => {
    const custom = makeElement('my-component', [makeText('slot')]);
    const root = makeRoot(custom);
    runPlugin(rehypeFilterInvalidElements, root);
    expect(root.children[0]).toBe(custom);
  });

  it('keeps standard tags: p, h1, code, pre, blockquote', () => {
    for (const tag of ['p', 'h1', 'code', 'pre', 'blockquote']) {
      const el = makeElement(tag);
      const root = makeRoot(el);
      runPlugin(rehypeFilterInvalidElements, root);
      expect(root.children[0]).toBe(el);
    }
  });

  it('strips tags starting with a digit', () => {
    const root = makeRoot(makeElement('1abc'));
    runPlugin(rehypeFilterInvalidElements, root);
    expect(root.children.find((c: any) => c.tagName === '1abc')).toBeUndefined();
  });

  it('strips tags containing only digits', () => {
    const root = makeRoot(makeElement('123'));
    runPlugin(rehypeFilterInvalidElements, root);
    expect(root.children.find((c: any) => c.tagName === '123')).toBeUndefined();
  });

  it('handles an element with no children gracefully', () => {
    const root = makeRoot(makeElement('0-invalid'));
    expect(() => runPlugin(rehypeFilterInvalidElements, root)).not.toThrow();
  });

  it('processes multiple invalid siblings', () => {
    const root = makeRoot(
      makeElement('300-306', [makeText('a')]),
      makeElement('p', [makeText('b')]),
      makeElement('400', [makeText('c')]),
    );
    runPlugin(rehypeFilterInvalidElements, root);
    const tags = root.children.filter((c: any) => c.type === 'element').map((c: any) => c.tagName);
    expect(tags).not.toContain('300-306');
    expect(tags).not.toContain('400');
    expect(tags).toContain('p');
  });
});

// ─── rehypeWikiLinks ──────────────────────────────────────────────────────────

describe('rehypeWikiLinks', () => {
  it('converts a wikiLink node to an <a> element', () => {
    const root = makeRoot(makeWikiLink('MyPage'));
    runPlugin(rehypeWikiLinks, root);
    const node = root.children[0];
    expect(node.type).toBe('element');
    expect(node.tagName).toBe('a');
  });

  it('adds class wiki-link', () => {
    const root = makeRoot(makeWikiLink('MyPage'));
    runPlugin(rehypeWikiLinks, root);
    expect(root.children[0].properties.className).toContain('wiki-link');
  });

  it('sets data-wiki-target to the link value', () => {
    const root = makeRoot(makeWikiLink('SomePage'));
    runPlugin(rehypeWikiLinks, root);
    expect(root.children[0].properties['data-wiki-target']).toBe('SomePage');
  });

  it('sets href to #', () => {
    const root = makeRoot(makeWikiLink('SomePage'));
    runPlugin(rehypeWikiLinks, root);
    expect(root.children[0].properties.href).toBe('#');
  });

  it('sets title containing the target name', () => {
    const root = makeRoot(makeWikiLink('SomePage'));
    runPlugin(rehypeWikiLinks, root);
    expect(root.children[0].properties.title).toContain('SomePage');
  });

  it('sets text child to the link value', () => {
    const root = makeRoot(makeWikiLink('MyPage'));
    runPlugin(rehypeWikiLinks, root);
    const textChild = root.children[0].children[0];
    expect(textChild).toEqual({ type: 'text', value: 'MyPage' });
  });

  it('handles multiple wikiLink nodes independently', () => {
    const root = makeRoot(makeWikiLink('PageA'), makeWikiLink('PageB'));
    runPlugin(rehypeWikiLinks, root);
    expect(root.children[0].properties['data-wiki-target']).toBe('PageA');
    expect(root.children[1].properties['data-wiki-target']).toBe('PageB');
  });

  it('does not modify non-wikiLink nodes', () => {
    const para = makeElement('p', [makeText('hello')]);
    const root = makeRoot(para, makeWikiLink('X'));
    runPlugin(rehypeWikiLinks, root);
    expect(root.children[0]).toBe(para);
  });
});
