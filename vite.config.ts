/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(),
    // Build official plugins as external bundles after main build
    {
      name: 'build-plugins',
      closeBundle() {
        // Only run during production build (not dev server)
        // @ts-expect-error process is a nodejs global
        if (process.env.NODE_ENV === 'production' || !host) {
          try {
            execSync('node scripts/build-plugins.mjs', {
              cwd: import.meta.dirname,
              stdio: 'inherit',
            });
          } catch {
            // Non-fatal: plugins can be rebuilt separately
            console.warn('\n⚠ Plugin build failed — run "node scripts/build-plugins.mjs" manually\n');
          }
        }
      },
    },
  ],

  // Milkdown Crepe bundles Vue-based UI internally; suppress esm-bundler warnings
  define: {
    __VUE_OPTIONS_API__: JSON.stringify(true),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
  },

  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/language",
            "@codemirror/lang-markdown",
            "@codemirror/language-data",
            "@codemirror/autocomplete",
            "@codemirror/search",
            "@codemirror/lint",
            "@codemirror/theme-one-dark",
            "@uiw/react-codemirror",
            "codemirror",
          ],
          mermaid: ["mermaid"],
          katex: ["katex"],
          markdownRender: [
            "react-markdown",
            "remark-gfm",
            "rehype-highlight",
            "rehype-katex",
            "rehype-raw",
            "rehype-slug",
          ],
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
}));
