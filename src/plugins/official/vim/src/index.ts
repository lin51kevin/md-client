/**
 * marklite-vim — Official Vim mode plugin.
 *
 * Dynamically imports @replit/codemirror-vim and registers the extension
 * via the vim-bridge so the core editor can pick it up.
 */
import { Prec } from '@codemirror/state';
import type { PluginContext } from '../../../plugin-sandbox';
import { registerVimExtension, unregisterVimExtension } from '../../../../lib/cm/vim-bridge';

export async function activate(_context: PluginContext) {
  const { vim } = await import('@replit/codemirror-vim');
  const ext = Prec.highest(vim());
  registerVimExtension(ext);
  return {
    deactivate: () => unregisterVimExtension(),
  };
}
