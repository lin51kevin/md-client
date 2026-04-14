import type { PluginContext } from './plugin-sandbox';

/**
 * Create the UI API for plugin contexts.
 * Allows plugins to show messages and modal dialogs.
 *
 * @returns The ui portion of the plugin context.
 */
export function createUIAPI(): PluginContext['ui'] {
  return {
    /**
     * Show a notification message to the user.
     * Dispatches a `plugin:showMessage` custom event.
     * @param message - The message text to display.
     * @param type - Severity level: 'info', 'warning', or 'error'. Defaults to 'info'.
     */
    showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info') {
      window.dispatchEvent(
        new CustomEvent('plugin:showMessage', { detail: { message, type } }),
      );
    },
    /**
     * Show a modal dialog.
     * @param _options - Modal configuration (title, content).
     * @deprecated Not yet implemented.
     */
    showModal(_options: { title: string; content: string }) {
      console.warn('[PluginAPI] showModal is not yet implemented');
      return Promise.resolve();
    },
  };
}