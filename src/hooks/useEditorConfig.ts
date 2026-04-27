/**
 * useEditorConfig — CodeMirror extension list and theme computation.
 *
 * Owns async vim loading, editorExtensions, and editorTheme.
 * Extracted from useEditorInstance to separate configuration concerns (pure
 * computation) from runtime state/event handling.
 */
import { useState, useEffect, useMemo } from 'react';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { commonLanguages } from '../lib/cm/cm-languages';
import { foldGutter } from '@codemirror/language';
import { THEMES, type ThemeName } from '../lib/theme';
import { sepiaCmTheme, highContrastCmTheme } from '../lib/cm/cm-themes';
import { autoCloseBrackets } from '../lib/cm/cmAutocomplete';
import { multicursorKeymap } from '../lib/cm/multicursor-keymap';
import { vimKeymap } from '../lib/cm/cmVim';

interface EditorConfigOptions {
  theme: ThemeName;
  vimMode: boolean;
  cursorExtension: Extension;
  searchHighlightExtension: Extension;
  /** When true, disables heavy extensions (folding, autocomplete) for performance */
  largeFile?: boolean;
}

export function useEditorConfig({ theme, vimMode, cursorExtension, searchHighlightExtension, largeFile = false }: EditorConfigOptions) {
  // Vim extension is loaded asynchronously
  const [vimExtension, setVimExtension] = useState<Extension | null>(null);
  useEffect(() => {
    vimKeymap().then(setVimExtension).catch(console.error);
  }, []);

  const editorExtensions = useMemo(() => {
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

    if (vimMode && vimExtension) {
      exts.push(vimExtension);
    }

    return exts;
  }, [cursorExtension, vimExtension, vimMode, searchHighlightExtension, largeFile]);

  const editorTheme = useMemo((): 'light' | 'dark' | Extension => {
    const cm = THEMES[theme].cmTheme;
    if (cm === 'sepia') return sepiaCmTheme as unknown as Extension;
    if (cm === 'high-contrast') return highContrastCmTheme as unknown as Extension;
    return cm;
  }, [theme]);

  return { editorExtensions, editorTheme };
}
