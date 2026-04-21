import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@tauri-apps/api/dialog': path.resolve('./src/__mocks__/tauri-dialog.ts'),
      '@tauri-apps/api/fs': path.resolve('./src/__mocks__/tauri-fs.ts'),
      '@tauri-apps/plugin-updater': path.resolve('./src/__mocks__/tauri-updater.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/__tests__/**/*.test.{ts,tsx,js}'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/__mocks__/**',
        'src/test-setup.ts',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 60,
      },
    },
    server: {
      deps: {
        inline: [/plugins\/official/],
        external: [/scripts\//],
      },
    },
  },
});
