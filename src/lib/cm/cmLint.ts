/**
 * cmLint — Lint diagnostics framework for CodeMirror.
 *
 * Maintains a registry of LintSource functions. The createLinterExtension()
 * builder produces the @codemirror/lint extensions needed to display
 * diagnostics (wavy underlines, tooltips) in the editor.
 *
 * Only call createLinterExtension() in **code mode** (non-Markdown).
 */
import { linter, lintGutter, type LintSource } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';

/** Internal registry of active lint sources. */
const linterRegistry = new Set<LintSource>();

/**
 * Register an external linter source. Returns an unsubscribe function.
 * Duplicate registrations of the same function reference are ignored.
 */
export function registerLinter(source: LintSource): () => void {
  linterRegistry.add(source);
  return () => {
    linterRegistry.delete(source);
  };
}

/** Return a snapshot of the current registry (read-only, for testing). */
export function getRegisteredLinters(): ReadonlySet<LintSource> {
  return linterRegistry;
}

/** Clear all registered linters (for testing). */
export function clearLinters(): void {
  linterRegistry.clear();
}

/**
 * Build the CodeMirror lint extension bundle.
 *
 * Includes:
 * - `lintGutter` — gutter markers for diagnostics
 * - A combined `linter()` extension that merges all registered sources
 *
 * Should only be used in code-file mode, not Markdown mode.
 */
export function createLinterExtension(): Extension[] {
  const exts: Extension[] = [lintGutter()];

  if (linterRegistry.size > 0) {
    // Merge all registered sources into a single linter call
    exts.push(
      linter((view) => {
        const diagnostics: import('@codemirror/lint').Diagnostic[] = [];
        for (const source of linterRegistry) {
          try {
            const result = source(view);
            // LintSource can return Diagnostic[] or async – handle sync only for now
            if (Array.isArray(result)) {
              diagnostics.push(...result);
            }
          } catch {
            // Individual linter errors should not break the editor
          }
        }
        return diagnostics;
      }),
    );
  }

  return exts;
}
