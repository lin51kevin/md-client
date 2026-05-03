import type { PluginContext } from '../../../plugin-sandbox';
import {
  registerKatexPlugin,
  unregisterKatexPlugin,
  ensureKatexCSS,
} from '../../../lib/markdown/katex-bridge';

export async function activate(_context: PluginContext) {
  const remarkMath = (await import('remark-math')).default;
  const rehypeKatex = (await import('rehype-katex')).default;

  registerKatexPlugin({ remarkMath, rehypeKatex });
  await ensureKatexCSS();

  return {
    deactivate: () => unregisterKatexPlugin(),
  };
}
