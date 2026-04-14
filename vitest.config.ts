import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Tauri APIs are unavailable in the Node/jsdom test environment.
      // Redirect them to empty stubs so tests that import usePlugins or other
      // Tauri-aware modules can load without a resolution error.
      '@tauri-apps/api/dialog': path.resolve('./src/__mocks__/tauri-dialog.ts'),
      '@tauri-apps/api/fs': path.resolve('./src/__mocks__/tauri-fs.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.{ts,tsx,js}'],
    setupFiles: ['./src/test-setup.ts'],
    server: {
      deps: {
        external: [/scripts\//],
      },
    },
  },
});
