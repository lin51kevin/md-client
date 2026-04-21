/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";
import path from "node:path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// ── Mermaid slim: exclude rarely-used diagram types ──────────────────
// These diagram chunks are lazily imported by mermaid.core.mjs.
// By resolving them to an empty stub, Rollup won't generate chunks for
// them.  If a user tries to render one of these types, mermaid will
// show a "diagram not registered" error instead of silently crashing.
const EXCLUDED_MERMAID_DIAGRAMS = [
  'wardleyDiagram',      // 507 KB (+ chevrotain parser)
  'architectureDiagram', // 146 KB (+ cytoscape 442 KB + cose-bilkent 82 KB)
  'c4Diagram',           //  70 KB
  'blockDiagram',        //  72 KB
  'vennDiagram',         //  42 KB
  'xychartDiagram',      //  39 KB
  'quadrantDiagram',     //  34 KB
  'requirementDiagram',  //  31 KB
  'sankeyDiagram',       //  22 KB
  'kanban-definition',   //  21 KB
  'ishikawaDiagram',     //  18 KB
];

// Parser module names in @mermaid-js/parser (shorter, no "Diagram" suffix)
const EXCLUDED_PARSER_MODULES = [
  'wardley',
  'architecture',
  'block',
  'kanban',
  'packet',        // packet diagram parser
  'radar',         // radar diagram parser
];

function mermaidSlimPlugin(): Plugin {
  return {
    name: 'mermaid-slim',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return null;
      const normalized = importer.replace(/\\/g, '/');

      // Intercept mermaid's internal diagram imports
      if (normalized.includes('node_modules/mermaid/')) {
        if (EXCLUDED_MERMAID_DIAGRAMS.some(d => source.includes(d))) {
          return '\0mermaid-excluded-diagram';
        }
        // Also exclude cose-bilkent layout (only used by architectureDiagram)
        if (source.includes('cose-bilkent')) {
          return '\0mermaid-excluded-diagram';
        }
      }

      // Intercept @mermaid-js/parser lazy grammar imports
      if (normalized.includes('node_modules/@mermaid-js/parser/')) {
        // Match parser module names like "wardley-RL74JXVD" or "architecture-YZFGNWBL"
        const basename = source.split('/').pop() || '';
        if (EXCLUDED_PARSER_MODULES.some(m => basename.startsWith(m + '-') || basename === m)) {
          return '\0mermaid-excluded-diagram';
        }
      }

      return null;
    },
    load(id) {
      if (id === '\0mermaid-excluded-diagram') {
        return 'export const diagram = undefined;';
      }
      return null;
    },
  };
}

// ── KaTeX font filter: keep only WOFF2 format ──────────────────────
function katexFontFilterPlugin(): Plugin {
  return {
    name: 'katex-font-filter',
    enforce: 'pre',
    resolveId(source) {
      // Block .ttf and .woff (non-woff2) font imports from KaTeX
      if (/katex.*\.(ttf|woff)$/i.test(source) && !/\.woff2$/i.test(source)) {
        return '\0empty-font';
      }
      return null;
    },
    load(id) {
      if (id === '\0empty-font') {
        return 'export default "";';
      }
      return null;
    },
    // Also clean up already-resolved font assets
    generateBundle(_options, bundle) {
      for (const key of Object.keys(bundle)) {
        if (/KaTeX_.*\.(ttf|woff)$/i.test(key) && !/\.woff2$/i.test(key)) {
          delete bundle[key];
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    mermaidSlimPlugin(),
    katexFontFilterPlugin(),
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

  // Redirect @codemirror/language-data to our curated subset (~20 languages).
  // @milkdown/crepe imports it transitively; this avoids bundling 89+ grammars.
  resolve: {
    alias: {
      '@codemirror/language-data': path.resolve(import.meta.dirname, 'src/lib/cm/cm-languages.ts'),
    },
  },

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

  worker: {
    // HTML import Worker uses a deferred module load so DOM globals can be
    // installed before turndown evaluates. That requires ES-module workers.
    format: 'es',
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
