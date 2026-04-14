/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      external: ['@tauri-apps/api/dialog', '@tauri-apps/api/fs'],
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
