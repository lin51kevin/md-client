/**
 * Curated CodeMirror language list for Markdown fenced code blocks.
 *
 * The full `@codemirror/language-data` bundles 89+ language grammars
 * (~436 KB).  This module provides only the ~20 most commonly used
 * languages, cutting the language-data footprint by ~80%.
 *
 * Each entry uses a lazy `load()` so the grammar is only fetched when
 * a fenced code block actually uses that language.
 */
import { LanguageDescription, LanguageSupport } from '@codemirror/language';

export const commonLanguages: LanguageDescription[] = [
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['js', 'jsx', 'node'],
    extensions: ['js', 'jsx', 'mjs', 'cjs'],
    load: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true })),
  }),
  LanguageDescription.of({
    name: 'TypeScript',
    alias: ['ts', 'tsx'],
    extensions: ['ts', 'tsx', 'mts', 'cts'],
    load: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true, typescript: true })),
  }),
  LanguageDescription.of({
    name: 'Python',
    alias: ['py'],
    extensions: ['py', 'pyw'],
    load: () => import('@codemirror/lang-python').then(m => m.python()),
  }),
  LanguageDescription.of({
    name: 'HTML',
    alias: ['htm'],
    extensions: ['html', 'htm'],
    load: () => import('@codemirror/lang-html').then(m => m.html()),
  }),
  LanguageDescription.of({
    name: 'CSS',
    alias: ['style'],
    extensions: ['css'],
    load: () => import('@codemirror/lang-css').then(m => m.css()),
  }),
  LanguageDescription.of({
    name: 'JSON',
    alias: ['json5'],
    extensions: ['json'],
    load: () => import('@codemirror/lang-javascript').then(m => m.javascript()),
  }),
  LanguageDescription.of({
    name: 'SQL',
    extensions: ['sql'],
    load: async () => {
      const { sql, StandardSQL } = await import('@codemirror/lang-sql' as string);
      return sql({ dialect: StandardSQL });
    },
  }),
  LanguageDescription.of({
    name: 'Markdown',
    alias: ['md'],
    extensions: ['md', 'markdown'],
    load: () => import('@codemirror/lang-markdown').then(m => m.markdown()),
  }),
  LanguageDescription.of({
    name: 'XML',
    alias: ['svg'],
    extensions: ['xml', 'xsl', 'svg'],
    load: () => import('@codemirror/lang-html').then(m => m.html({ matchClosingTags: true })),
  }),
  LanguageDescription.of({
    name: 'Java',
    extensions: ['java'],
    load: () => import('@codemirror/lang-java').then(m => m.java()),
  }),
  LanguageDescription.of({
    name: 'C++',
    alias: ['cpp', 'c', 'h', 'hpp', 'objc', 'arduino'],
    extensions: ['cpp', 'c', 'cc', 'h', 'hpp', 'cxx', 'm', 'mm'],
    load: () => import('@codemirror/lang-cpp').then(m => m.cpp()),
  }),
  LanguageDescription.of({
    name: 'Rust',
    alias: ['rs'],
    extensions: ['rs'],
    load: () => import('@codemirror/lang-rust').then(m => m.rust()),
  }),
  LanguageDescription.of({
    name: 'Go',
    alias: ['golang'],
    extensions: ['go'],
    load: () => import('@codemirror/lang-go').then(m => m.go()),
  }),
  LanguageDescription.of({
    name: 'PHP',
    extensions: ['php'],
    load: () => import('@codemirror/lang-php').then(m => m.php()),
  }),
  LanguageDescription.of({
    name: 'YAML',
    alias: ['yml'],
    extensions: ['yaml', 'yml'],
    load: async () => {
      const { StreamLanguage } = await import('@codemirror/language');
      const { yaml } = await import('@codemirror/legacy-modes/mode/yaml' as string);
      return new LanguageSupport(StreamLanguage.define(yaml));
    },
  }),
  LanguageDescription.of({
    name: 'Shell',
    alias: ['bash', 'sh', 'zsh', 'console'],
    extensions: ['sh', 'bash', 'zsh'],
    load: async () => {
      const { StreamLanguage } = await import('@codemirror/language');
      const { shell } = await import('@codemirror/legacy-modes/mode/shell' as string);
      return new LanguageSupport(StreamLanguage.define(shell));
    },
  }),
  LanguageDescription.of({
    name: 'Ruby',
    alias: ['rb'],
    extensions: ['rb'],
    load: async () => {
      const { StreamLanguage } = await import('@codemirror/language');
      const { ruby } = await import('@codemirror/legacy-modes/mode/ruby' as string);
      return new LanguageSupport(StreamLanguage.define(ruby));
    },
  }),
  LanguageDescription.of({
    name: 'Dockerfile',
    alias: ['docker'],
    extensions: ['dockerfile'],
    load: async () => {
      const { StreamLanguage } = await import('@codemirror/language');
      const { dockerFile } = await import('@codemirror/legacy-modes/mode/dockerfile' as string);
      return new LanguageSupport(StreamLanguage.define(dockerFile));
    },
  }),
  LanguageDescription.of({
    name: 'TOML',
    extensions: ['toml'],
    load: async () => {
      const { StreamLanguage } = await import('@codemirror/language');
      const { toml } = await import('@codemirror/legacy-modes/mode/toml' as string);
      return new LanguageSupport(StreamLanguage.define(toml));
    },
  }),
  LanguageDescription.of({
    name: 'Diff',
    alias: ['patch'],
    extensions: ['diff', 'patch'],
    load: async () => {
      const { StreamLanguage } = await import('@codemirror/language');
      const { diff } = await import('@codemirror/legacy-modes/mode/diff' as string);
      return new LanguageSupport(StreamLanguage.define(diff));
    },
  }),
];

// Re-export as `languages` so this module can be used as a drop-in
// replacement for `@codemirror/language-data` (via Vite resolve.alias).
export const languages = commonLanguages;
