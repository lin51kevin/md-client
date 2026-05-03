/**
 * useEditorConfig — CodeMirror extension list and theme computation.
 *
 * Owns async vim loading, editorExtensions, and editorTheme.
 * Extracted from useEditorInstance to separate configuration concerns (pure
 * computation) from runtime state/event handling.
 *
 * Supports both Markdown mode and code-file mode (language-aware editing).
 */
import { useState, useEffect, useMemo } from 'react';
import type { Extension } from '@codemirror/state';
import { getVimExtension } from '../lib/cm/vim-bridge';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { commonLanguages } from '../lib/cm/cm-languages';
import { foldGutter } from '@codemirror/language';
import { THEMES, type ThemeName } from '../lib/theme';
import { sepiaCmTheme, highContrastCmTheme } from '../lib/cm/cm-themes';
import { autoCloseBrackets } from '../lib/cm/cmAutocomplete';
import { multicursorKeymap } from '../lib/cm/multicursor-keymap';
import { codeBaseExtensions, loadLanguageExtension } from '../lib/cm/cm-code-extensions';

interface EditorConfigOptions {
  theme: ThemeName;
  vimMode: boolean;
  cursorExtension: Extension;
  searchHighlightExtension: Extension;
  /** When true, disables heavy extensions (folding, autocomplete) for performance */
  largeFile?: boolean;
  /** Language ID of the active file (e.g. 'markdown', 'typescript', 'python') */
  languageId?: string;
}

export function useEditorConfig({ theme, vimMode, cursorExtension, searchHighlightExtension, largeFile = false, languageId = 'markdown' }: EditorConfigOptions) {


  // Code language extension — loaded asynchronously when languageId changes
  const isCodeMode = languageId !== 'markdown';
  const [codeLangExtension, setCodeLangExtension] = useState<Extension | null>(null);
  useEffect(() => {
    if (!isCodeMode) {
      setCodeLangExtension(null);
      return;
    }
    let cancelled = false;
    loadLanguageExtension(languageId).then((ext) => {
      if (!cancelled) setCodeLangExtension(ext);
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [languageId, isCodeMode]);

  const editorExtensions = useMemo(() => {
    if (isCodeMode) {
      // Code file mode: use code-specific extensions
      const exts: Extension[] = [
        ...codeBaseExtensions(),
        cursorExtension,
        searchHighlightExtension,
        multicursorKeymap(),
      ];
      if (codeLangExtension) {
        exts.push(codeLangExtension);
      }
      {
        const vimExt = getVimExtension();
        if (vimMode && vimExt) exts.push(vimExt);
      }
      return exts;
    }

    // Markdown mode: original behavior
    const exts: Extension[] = [
      markdown({ base: markdownLanguage, codeLanguages: largeFile ? [] : commonLanguages }),
      EditorView.lineWrapping,
      cursorExtension,
      searchHighlightExtension,
      multicursorKeymap(),
    ];

    if (!largeFile) {
      exts.push(foldGutter());
      exts.push(autoCloseBrackets());
    }

    {
      const vimExt = getVimExtension();
      if (vimMode && vimExt) exts.push(vimExt);
    }

    return exts;
  }, [cursorExtension, vimMode, searchHighlightExtension, largeFile, isCodeMode, codeLangExtension]);

  const editorTheme = useMemo((): 'light' | 'dark' | Extension => {
    const cm = THEMES[theme].cmTheme;
    if (cm === 'sepia') return sepiaCmTheme as unknown as Extension;
    if (cm === 'high-contrast') return highContrastCmTheme as unknown as Extension;
    return cm;
  }, [theme]);

  return { editorExtensions, editorTheme };
}
