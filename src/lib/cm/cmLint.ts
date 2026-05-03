/**
 * cmLint — Lint diagnostics framework for CodeMirror.
 *
 * Maintains a registry of named LintSource functions. The createLinterExtension()
 * builder produces the @codemirror/lint extensions needed to display
 * diagnostics (wavy underlines, tooltips) in the editor.
 *
 * Only call createLinterExtension() in **code mode** (non-Markdown).
 */
import { linter, lintGutter, type LintSource, type Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/** Internal registry of named lint sources. */
const linterRegistry = new Map<string, LintSource>();

/**
 * Register a named linter source. Returns an unsubscribe function.
 * Re-registering with the same name replaces the previous source.
 */
export function registerLinter(name: string, source: LintSource): () => void {
  linterRegistry.set(name, source);
  return () => {
    linterRegistry.delete(name);
  };
}

/** Return all registered lint sources (for testing). */
export function getLintSources(): LintSource[] {
  return Array.from(linterRegistry.values());
}

/** Clear all registered linters (for testing). */
export function clearAllLinters(): void {
  linterRegistry.clear();
  cachedLintExtensions = null;
}

/**
 * Build the CodeMirror lint extension bundle.
 *
 * Includes:
 * - `lintGutter` — gutter markers for diagnostics
 * - A combined `linter()` extension that merges all registered sources
 *
 * Should only be used in code-file mode, not Markdown mode.
 *
 * Returns the same extension instances on repeated calls to avoid
 * unnecessary CodeMirror teardown/reinit when the host useMemo recomputes.
 */
let cachedLintExtensions: Extension[] | null = null;

export function createLinterExtension(): Extension[] {
  if (cachedLintExtensions) return cachedLintExtensions;

  const exts: Extension[] = [lintGutter()];

  exts.push(
    linter(async (view: EditorView): Promise<Diagnostic[]> => {
      const diagnostics: Diagnostic[] = [];
      for (const source of linterRegistry.values()) {
        try {
          const result = await source(view);
          if (result) {
            diagnostics.push(...result);
          }
        } catch {
          // Individual linter errors should not break the editor
        }
      }
      return diagnostics;
    }),
  );

  cachedLintExtensions = exts;
  return exts;
}
