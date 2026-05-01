/**
 * CodeMirror extensions for non-Markdown (code) editing mode.
 *
 * Provides bracket matching, indent guides, autocompletion, and
 * language-specific extensions that are activated when editing code files.
 */
import type { Extension } from '@codemirror/state';
import { bracketMatching, indentOnInput, foldGutter } from '@codemirror/language';
import { closeBrackets, autocompletion } from '@codemirror/autocomplete';
import { highlightActiveLine, lineNumbers, EditorView } from '@codemirror/view';
import { commonLanguages } from './cm-languages';
import { LanguageDescription } from '@codemirror/language';

/**
 * Base extensions for code editing mode.
 * These are always active when editing a non-Markdown file.
 */
export function codeBaseExtensions(): Extension[] {
  return [
    lineNumbers(),
    foldGutter(),
    highlightActiveLine(),
    bracketMatching(),
    indentOnInput(),
    closeBrackets(),
    autocompletion(),
    EditorView.lineWrapping,
  ];
}

/**
 * Lazily load the CodeMirror language extension for a given language ID.
 * Returns null if the language is not recognized.
 */
export async function loadLanguageExtension(languageId: string): Promise<Extension | null> {
  // First try to find a matching LanguageDescription from our curated list
  const desc = commonLanguages.find(
    (lang) =>
      lang.name.toLowerCase() === languageId ||
      lang.alias?.some((a) => a === languageId) ||
      // extensions check: matches when languageId is an extension alias (e.g. 'js')
      lang.extensions?.some((e) => e === languageId)
  );

  if (desc) {
    const support = await desc.load();
    return support;
  }

  // Fallback: try to match by language ID directly
  const match = LanguageDescription.matchLanguageName(commonLanguages, languageId, true);
  if (match) {
    const support = await match.load();
    return support;
  }

  return null;
}
