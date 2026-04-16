#!/usr/bin/env node
/**
 * Build each official plugin as a standalone ESM bundle.
 *
 * Shared dependencies (React, lucide-react, i18n) are NOT bundled into
 * each plugin.  Instead the esbuild resolve-plugin rewrites their
 * imports to read from `window.__MARKLITE_SHARED__`, which the main app
 * populates via src/plugin-shared.ts.
 *
 * Usage:
 *   node scripts/build-plugins.mjs            # build all
 *   node scripts/build-plugins.mjs backlinks   # build one
 */

import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PLUGINS_SRC = path.join(ROOT, 'src', 'plugins', 'official');
const DIST_PLUGINS = path.join(ROOT, 'resources', 'plugins');

// ── Shared dependency handling ──────────────────────────────────────
//
// We dynamically build the named-export list by importing each module
// at build-time (we are running in Node, so node_modules are available).

/** Build an ESM shim: `const m = window.__MARKLITE_SHARED__[key]; export const {a,b,...} = m;` */
async function makeShim(key, moduleSpecifier) {
  const mod = await import(moduleSpecifier);
  const names = Object.keys(mod).filter(n => /^[a-zA-Z_$]/.test(n) && n !== 'default');
  const lines = [`const __m = window.__MARKLITE_SHARED__["${key}"];`];
  if (mod.default !== undefined) {
    lines.push(`export default __m.default !== undefined ? __m.default : __m;`);
  }
  if (names.length) {
    lines.push(`export const { ${names.join(', ')} } = __m;`);
  }
  return lines.join('\n');
}

// Build shims once (they're the same for every plugin)
const SHARED_MODULES = {
  'react': 'react',
  'react/jsx-runtime': 'react/jsx-runtime',
  'react-markdown': 'react-markdown',
  'remark-gfm': 'remark-gfm',
  'rehype-highlight': 'rehype-highlight',
};

// App-internal modules exposed as shared
const INTERNAL_SHARED = new Map([
  // Resolved absolute path → shared key
]);

// Resolve the canonical path for app i18n module
const I18N_ABS = fs.realpathSync(path.join(ROOT, 'src', 'i18n', 'index.ts'));

async function buildShims() {
  const shims = {};
  for (const [key, specifier] of Object.entries(SHARED_MODULES)) {
    shims[key] = await makeShim(key, specifier);
  }
  // i18n shim — we know the exact exports
  shims['@marklite/i18n'] = [
    `const __m = window.__MARKLITE_SHARED__["@marklite/i18n"];`,
    `export default __m;`,
    `export const { useI18n, getT, I18nContext, useI18nProvider } = __m;`,
  ].join('\n');
  return shims;
}

// ── esbuild plugin: resolve shared deps to global shims ─────────────

function sharedGlobalsPlugin(shims) {
  return {
    name: 'marklite-shared-globals',
    setup(b) {
      // NPM shared deps
      const npmFilter = new RegExp(
        `^(${Object.keys(SHARED_MODULES).map(k => k.replace('/', '\\/')).join('|')})$`
      );
      b.onResolve({ filter: npmFilter }, args => ({
        path: args.path,
        namespace: 'shared-globals',
      }));

      // App-internal i18n — match any relative import that resolves to src/i18n
      b.onResolve({ filter: /i18n/ }, args => {
        if (args.namespace === 'shared-globals') return undefined;
        if (!args.resolveDir) return undefined;

        // Try to resolve the import relative to the source file
        const candidates = [
          path.resolve(args.resolveDir, args.path),
          path.resolve(args.resolveDir, args.path + '.ts'),
          path.resolve(args.resolveDir, args.path, 'index.ts'),
        ];
        for (const c of candidates) {
          try {
            const real = fs.realpathSync(c);
            if (real === I18N_ABS || real === I18N_ABS.replace('.ts', '.js')) {
              return { path: '@marklite/i18n', namespace: 'shared-globals' };
            }
          } catch { /* not found, skip */ }
        }
        return undefined;
      });

      // Resolve plugin-sandbox type imports (type-only, but esbuild may see them)
      b.onResolve({ filter: /plugin-sandbox/ }, args => {
        if (args.kind === 'import-statement') {
          // These are type-only imports — return empty module
          return { path: args.path, namespace: 'empty-module' };
        }
        return undefined;
      });

      b.onLoad({ filter: /.*/, namespace: 'shared-globals' }, args => ({
        contents: shims[args.path] || `export default window.__MARKLITE_SHARED__["${args.path}"];`,
        loader: 'js',
      }));

      b.onLoad({ filter: /.*/, namespace: 'empty-module' }, () => ({
        contents: '',
        loader: 'js',
      }));
    },
  };
}

// ── Discover & build plugins ────────────────────────────────────────

function discoverPlugins(filter) {
  const dirs = fs.readdirSync(PLUGINS_SRC, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  if (filter) {
    const matched = dirs.filter(d => d === filter || d.includes(filter));
    if (matched.length === 0) {
      console.error(`No plugin matching "${filter}" found.  Available: ${dirs.join(', ')}`);
      process.exit(1);
    }
    return matched;
  }
  return dirs;
}

function findEntryPoint(pluginDir) {
  for (const ext of ['.ts', '.tsx']) {
    const entry = path.join(pluginDir, 'src', `index${ext}`);
    if (fs.existsSync(entry)) return entry;
  }
  return null;
}

async function main() {
  const filter = process.argv[2];
  const pluginNames = discoverPlugins(filter);
  const shims = await buildShims();

  console.log(`Building ${pluginNames.length} plugin(s): ${pluginNames.join(', ')}`);

  const results = await Promise.all(
    pluginNames.map(async (name) => {
      const pluginSrc = path.join(PLUGINS_SRC, name);
      const entry = findEntryPoint(pluginSrc);
      if (!entry) {
        console.warn(`  ⚠ ${name}: no entry point found, skipping`);
        return null;
      }

      const outDir = path.join(DIST_PLUGINS, `marklite-${name}`, 'dist');
      const manifestSrc = path.join(pluginSrc, 'manifest.json');
      const manifestDst = path.join(DIST_PLUGINS, `marklite-${name}`, 'manifest.json');

      // Build with esbuild
      await build({
        entryPoints: [entry],
        bundle: true,
        format: 'esm',
        outfile: path.join(outDir, 'index.js'),
        minify: true,
        sourcemap: false,
        target: ['es2022'],
        jsx: 'automatic',
        jsxImportSource: 'react',
        plugins: [sharedGlobalsPlugin(shims)],
        logLevel: 'warning',
      });

      // Copy manifest.json
      if (fs.existsSync(manifestSrc)) {
        fs.mkdirSync(path.dirname(manifestDst), { recursive: true });
        fs.copyFileSync(manifestSrc, manifestDst);
      }

      const stat = fs.statSync(path.join(outDir, 'index.js'));
      console.log(`  ✓ ${name} → ${(stat.size / 1024).toFixed(1)} KB`);
      return name;
    })
  );

  const built = results.filter(Boolean);
  console.log(`\nDone! ${built.length} plugin(s) built to resources/plugins/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
