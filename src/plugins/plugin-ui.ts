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
     * Dispatches a `plugin:showModal` custom event and returns a promise
     * that resolves when the host dispatches `plugin:modalResult`.
     * @param options - Modal configuration (title, content, type).
     */
    showModal(options: {
      title: string;
      content: string;
      type?: 'info' | 'confirm';
    }): Promise<boolean | void> {
      return new Promise((resolve) => {
        const handler = (e: Event) => {
          const result = (e as CustomEvent).detail?.result;
          window.removeEventListener('plugin:modalResult', handler);
          resolve(result);
        };
        window.addEventListener('plugin:modalResult', handler);
        window.dispatchEvent(
          new CustomEvent('plugin:showModal', {
            detail: { ...options, resolve },
          }),
        );
      });
    },
  };
}