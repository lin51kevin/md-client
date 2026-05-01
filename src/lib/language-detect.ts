/**
 * Language detection from file paths.
 *
 * Maps file extensions to language IDs used by CodeMirror and the UI.
 * Provides helpers for checking file types and listing supported extensions.
 */

export interface LanguageInfo {
  /** Short identifier (e.g. 'typescript', 'python') */
  id: string;
  /** Display name (e.g. 'TypeScript', 'Python') */
  name: string;
  /** Whether this is a Markdown-family file */
  isMarkdown: boolean;
}

/** Extension → LanguageInfo mapping (lowercase, without leading dot)
 * IMPORTANT: Must stay in sync with `SUPPORTED_TEXT_EXTENSIONS` in `src-tauri/src/lib.rs` (Rust backend).
 */
const EXTENSION_MAP: Record<string, LanguageInfo> = {
  // Markdown family
  md: { id: 'markdown', name: 'Markdown', isMarkdown: true },
  markdown: { id: 'markdown', name: 'Markdown', isMarkdown: true },
  mdx: { id: 'markdown', name: 'MDX', isMarkdown: true },
  txt: { id: 'markdown', name: 'Plain Text', isMarkdown: true },

  // JavaScript / TypeScript
  js: { id: 'javascript', name: 'JavaScript', isMarkdown: false },
  jsx: { id: 'javascript', name: 'JavaScript (JSX)', isMarkdown: false },
  mjs: { id: 'javascript', name: 'JavaScript', isMarkdown: false },
  cjs: { id: 'javascript', name: 'JavaScript', isMarkdown: false },
  ts: { id: 'typescript', name: 'TypeScript', isMarkdown: false },
  tsx: { id: 'typescript', name: 'TypeScript (TSX)', isMarkdown: false },
  mts: { id: 'typescript', name: 'TypeScript', isMarkdown: false },
  cts: { id: 'typescript', name: 'TypeScript', isMarkdown: false },

  // Python
  py: { id: 'python', name: 'Python', isMarkdown: false },
  pyw: { id: 'python', name: 'Python', isMarkdown: false },

  // Web
  html: { id: 'html', name: 'HTML', isMarkdown: false },
  htm: { id: 'html', name: 'HTML', isMarkdown: false },
  css: { id: 'css', name: 'CSS', isMarkdown: false },
  scss: { id: 'scss', name: 'SCSS', isMarkdown: false },
  less: { id: 'less', name: 'Less', isMarkdown: false },

  // Data formats
  json: { id: 'json', name: 'JSON', isMarkdown: false },
  json5: { id: 'json', name: 'JSON5', isMarkdown: false },
  yaml: { id: 'yaml', name: 'YAML', isMarkdown: false },
  yml: { id: 'yaml', name: 'YAML', isMarkdown: false },
  toml: { id: 'toml', name: 'TOML', isMarkdown: false },
  xml: { id: 'xml', name: 'XML', isMarkdown: false },
  xsl: { id: 'xml', name: 'XSL', isMarkdown: false },
  svg: { id: 'xml', name: 'SVG', isMarkdown: false },

  // Systems languages
  rs: { id: 'rust', name: 'Rust', isMarkdown: false },
  go: { id: 'go', name: 'Go', isMarkdown: false },
  c: { id: 'cpp', name: 'C', isMarkdown: false },
  h: { id: 'cpp', name: 'C Header', isMarkdown: false },
  cpp: { id: 'cpp', name: 'C++', isMarkdown: false },
  cc: { id: 'cpp', name: 'C++', isMarkdown: false },
  cxx: { id: 'cpp', name: 'C++', isMarkdown: false },
  hpp: { id: 'cpp', name: 'C++ Header', isMarkdown: false },

  // JVM
  java: { id: 'java', name: 'Java', isMarkdown: false },
  kt: { id: 'kotlin', name: 'Kotlin', isMarkdown: false },
  kts: { id: 'kotlin', name: 'Kotlin Script', isMarkdown: false },

  // Other languages
  php: { id: 'php', name: 'PHP', isMarkdown: false },
  rb: { id: 'ruby', name: 'Ruby', isMarkdown: false },
  swift: { id: 'swift', name: 'Swift', isMarkdown: false },
  sql: { id: 'sql', name: 'SQL', isMarkdown: false },

  // Shell & config
  sh: { id: 'shell', name: 'Shell', isMarkdown: false },
  bash: { id: 'shell', name: 'Bash', isMarkdown: false },
  zsh: { id: 'shell', name: 'Zsh', isMarkdown: false },
  dockerfile: { id: 'dockerfile', name: 'Dockerfile', isMarkdown: false },
  ini: { id: 'ini', name: 'INI', isMarkdown: false },
  conf: { id: 'ini', name: 'Config', isMarkdown: false },
  env: { id: 'ini', name: 'Env', isMarkdown: false },

  // Misc
  diff: { id: 'diff', name: 'Diff', isMarkdown: false },
  patch: { id: 'diff', name: 'Patch', isMarkdown: false },
  makefile: { id: 'makefile', name: 'Makefile', isMarkdown: false },
  graphql: { id: 'graphql', name: 'GraphQL', isMarkdown: false },
  gql: { id: 'graphql', name: 'GraphQL', isMarkdown: false },
};

/** Special filenames (no extension) → language
 * TODO: Rust backend SUPPORTED_TEXT_EXTENSIONS and drag-drop TEXT_EXT_RE
 * do not yet handle extensionless files (e.g. Dockerfile, Makefile).
 * These are only detected when opened via file dialog. */
const FILENAME_MAP: Record<string, LanguageInfo> = {
  dockerfile: { id: 'dockerfile', name: 'Dockerfile', isMarkdown: false },
  makefile: { id: 'makefile', name: 'Makefile', isMarkdown: false },
  '.gitignore': { id: 'ini', name: 'Git Ignore', isMarkdown: false },
  '.env': { id: 'ini', name: 'Env', isMarkdown: false },
  '.editorconfig': { id: 'ini', name: 'EditorConfig', isMarkdown: false },
};

const DEFAULT_LANGUAGE: LanguageInfo = { id: 'plaintext', name: 'Plain Text', isMarkdown: false };

/**
 * Detect language from a file path.
 */
export function getLanguageFromPath(filePath: string | null | undefined): LanguageInfo {
  if (!filePath) return { id: 'markdown', name: 'Markdown', isMarkdown: true };

  const fileName = filePath.split(/[/\\]/).pop()?.toLowerCase() ?? '';

  // Check special filenames first
  const byName = FILENAME_MAP[fileName];
  if (byName) return byName;

  // Extract extension
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) return DEFAULT_LANGUAGE;

  const ext = fileName.slice(dotIndex + 1);
  return EXTENSION_MAP[ext] ?? DEFAULT_LANGUAGE;
}

/**
 * Check if a file path is a Markdown-family file.
 */
export function isMarkdownFile(filePath: string | null | undefined): boolean {
  return getLanguageFromPath(filePath).isMarkdown;
}

/** All Markdown-family extensions */
export const MARKDOWN_EXTENSIONS = Object.entries(EXTENSION_MAP)
  .filter(([, info]) => info.isMarkdown)
  .map(([ext]) => ext);

/** All supported code file extensions (non-markdown) */
export const SUPPORTED_CODE_EXTENSIONS = Object.entries(EXTENSION_MAP)
  .filter(([, info]) => !info.isMarkdown)
  .map(([ext]) => ext);

/** All supported file extensions (markdown + code) */
export const ALL_SUPPORTED_EXTENSIONS = Object.keys(EXTENSION_MAP);
