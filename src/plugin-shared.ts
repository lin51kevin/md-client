/**
 * Expose shared modules as globals so externally-built plugins can
 * resolve them at runtime without bundling their own copies.
 *
 * Only modules that MUST be singletons are shared here:
 * - React (duplicate instances break hooks)
 * - i18n (must share React Context identity)
 *
 * lucide-react is intentionally NOT shared — plugins bundle only the
 * few icons they use, which is smaller than forcing the entire library
 * into the main bundle.
 */

import * as React from 'react';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import * as i18n from './i18n';
import * as ReactMarkdown from 'react-markdown';
import * as remarkGfm from 'remark-gfm';
import * as rehypeHighlight from 'rehype-highlight';
import * as cmState from '@codemirror/state';
import * as cmView from '@codemirror/view';
import * as cmLint from '@codemirror/lint';
import * as cmAutocomplete from '@codemirror/autocomplete';
import * as katexBridge from './lib/markdown/katex-bridge';
import * as mermaidBridge from './lib/markdown/mermaid-bridge';
import * as vimBridge from './lib/cm/vim-bridge';
import * as pngBridge from './lib/export/png-bridge';
import * as minimapBridge from './lib/cm/minimap-bridge';

declare global {
  interface Window {
    __MARKLITE_SHARED__: Record<string, unknown>;
  }
}

window.__MARKLITE_SHARED__ = {
  'react': React,
  'react/jsx-runtime': ReactJSXRuntime,
  '@marklite/i18n': i18n,
  'react-markdown': ReactMarkdown,
  'remark-gfm': remarkGfm,
  'rehype-highlight': rehypeHighlight,
  '@codemirror/state': cmState,
  '@codemirror/view': cmView,
  '@codemirror/lint': cmLint,
  '@codemirror/autocomplete': cmAutocomplete,
  '@marklite/katex-bridge': katexBridge,
  '@marklite/mermaid-bridge': mermaidBridge,
  '@marklite/vim-bridge': vimBridge,
  '@marklite/png-bridge': pngBridge,
  '@marklite/minimap-bridge': minimapBridge,
};
