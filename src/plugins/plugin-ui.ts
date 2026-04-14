import type { PluginContext } from './plugin-sandbox';

export function createUIAPI(): PluginContext['ui'] {
  return {
    showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info') {
      window.dispatchEvent(
        new CustomEvent('plugin:showMessage', { detail: { message, type } }),
      );
    },
    showModal(_options: { title: string; content: string }) {
      console.warn('[PluginAPI] showModal is not yet implemented');
      return Promise.resolve();
    },
  };
}