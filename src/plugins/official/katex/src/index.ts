import type { PluginContext } from '../../../plugin-sandbox';
import {
  registerKatexPlugin,
  unregisterKatexPlugin,
  ensureKatexCSS,
} from '../../../../lib/markdown/katex-bridge';

export async function activate(_context: PluginContext) {
  const remarkMath = (await import('remark-math')).default;
  const rehypeKatex = (await import('rehype-katex')).default;
  const katex = (await import('katex')).default;
  const katexCss = (await import('katex/dist/katex.min.css?raw')).default;

  // Inject KaTeX CSS into the DOM
  if (!document.querySelector('style[data-katex]')) {
    const style = document.createElement('style');
    style.setAttribute('data-katex', '');
    style.textContent = katexCss;
    document.head.appendChild(style);
  }

  registerKatexPlugin({
    remarkMath,
    rehypeKatex,
    renderToString: (formula, opts) => katex.renderToString(formula, opts),
    getCSSString: () => katexCss,
  });
  ensureKatexCSS();

  return {
    deactivate: () => unregisterKatexPlugin(),
  };
}
