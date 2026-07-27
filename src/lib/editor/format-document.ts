/**
 * Code / document formatting via Prettier (standalone, browser-safe).
 *
 * Prettier core and every language plugin are loaded through dynamic
 * `import()` so they are bundled into a separate, lazily-fetched chunk and
 * never inflate the initial application bundle. The first format action for a
 * given language pays a one-time download cost; subsequent calls reuse the
 * cached module.
 */
import type { Plugin } from 'prettier';

export interface FormatSuccess {
  /** Formatted source text. */
  formatted: string;
  /** New cursor offset mapped by Prettier into the formatted text. */
  cursorOffset: number;
}

export interface FormatUnsupported {
  unsupported: true;
}

export type FormatOutcome = FormatSuccess | FormatUnsupported;

/** languageId (from `getLanguageFromPath`) → Prettier parser name. */
const PARSER_BY_LANGUAGE: Record<string, string> = {
  javascript: 'babel',
  typescript: 'typescript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  yaml: 'yaml',
  markdown: 'markdown',
  graphql: 'graphql',
  xml: 'xml',
};

/** Whether the given language can be formatted by Prettier. */
export function canFormatLanguage(languageId: string): boolean {
  return languageId in PARSER_BY_LANGUAGE;
}

/** Load the Prettier plugin(s) required for a given parser. */
async function loadPlugins(parser: string): Promise<Plugin[]> {
  switch (parser) {
    case 'babel':
    case 'json': {
      const [babel, estree] = await Promise.all([
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree'),
      ]);
      return [babel.default, estree.default];
    }
    case 'typescript': {
      const [ts, estree] = await Promise.all([
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ]);
      return [ts.default, estree.default];
    }
    case 'css':
    case 'scss':
    case 'less': {
      const postcss = await import('prettier/plugins/postcss');
      return [postcss.default];
    }
    case 'html': {
      const html = await import('prettier/plugins/html');
      return [html.default];
    }
    case 'yaml': {
      const yaml = await import('prettier/plugins/yaml');
      return [yaml.default];
    }
    case 'markdown': {
      const markdown = await import('prettier/plugins/markdown');
      return [markdown.default];
    }
    case 'graphql': {
      const graphql = await import('prettier/plugins/graphql');
      return [graphql.default];
    }
    case 'xml': {
      const xml = await import('@prettier/plugin-xml');
      // Some builds expose the plugin as the module namespace itself.
      return [(xml.default ?? xml) as unknown as Plugin];
    }
    default:
      return [];
  }
}

export interface FormatOptions {
  /** Indentation width in spaces. Defaults to 2 (matches the editor). */
  tabWidth?: number;
  /** Current cursor offset, preserved across formatting when possible. */
  cursorOffset?: number;
}

/**
 * Format source code with Prettier, preserving cursor position.
 *
 * Returns `{ unsupported: true }` for languages Prettier cannot handle.
 * Throws (e.g. `SyntaxError`) when the source cannot be parsed — callers
 * should catch and surface a user-friendly error.
 */
export async function formatCode(
  code: string,
  languageId: string,
  options: FormatOptions = {},
): Promise<FormatOutcome> {
  const parser = PARSER_BY_LANGUAGE[languageId];
  if (!parser) return { unsupported: true };

  const { formatWithCursor } = await import('prettier/standalone');
  const plugins = await loadPlugins(parser);
  const cursorOffset = Math.max(0, Math.min(options.cursorOffset ?? 0, code.length));

  const result = await formatWithCursor(code, {
    parser,
    plugins,
    tabWidth: options.tabWidth ?? 2,
    cursorOffset,
  });

  return {
    formatted: result.formatted,
    cursorOffset: Math.max(0, result.cursorOffset),
  };
}
