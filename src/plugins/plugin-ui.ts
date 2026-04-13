export function createUIAPI(): Record<string, (...args: unknown[]) => unknown> {
  return {
    showMessage(message: string) {
      window.alert(message);
    },
    showModal(_options: unknown) {
      console.warn('[PluginAPI] showModal is not yet implemented');
      return { dispose() {} };
    },
  };
}
