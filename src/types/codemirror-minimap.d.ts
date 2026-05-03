declare module '@codemirror/minimap' {
  import { Extension } from '@codemirror/state';
  export function minimap(config?: Record<string, unknown>): Extension;
}
