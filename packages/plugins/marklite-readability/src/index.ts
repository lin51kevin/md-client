import type { Disposable, PluginContext, PluginManifest } from '@marklite/plugin-api';

export const manifest: PluginManifest = {
  id: 'marklite-readability',
  name: 'Readability Score',
  version: '0.1.0',
  description: 'Flesch-Kincaid Grade Level readability score in the status bar',
  author: 'MarkLite Team',
  main: 'dist/index.js',
  activationEvents: ['onStartup'],
  permissions: ['statusbar.item', 'editor.read'],
};

// ── Flesch-Kincaid Grade Level ─────────────────────────────────────────────
// Formula: 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 2) return 1;
  if (w.endsWith('e')) {
    // silent e
    const trimmed = w.slice(0, -1);
    if (countVowelGroups(trimmed) <= 1) return 1;
    return countVowelGroups(trimmed);
  }
  return countVowelGroups(w) || 1;
}

function countVowelGroups(s: string): number {
  return (s.match(/[aeiouy]+/g) || []).length;
}

function tokenizeWords(text: string): string[] {
  // Match sequences of word characters (including apostrophes)
  return text.match(/[a-zA-Z']+/g) || [];
}

function countSentences(text: string): number {
  if (!text.trim()) return 0;
  // Split on . ! ? followed by space, newline, or end of string
  const matches = text.match(/[.!?]+[\s\n]|.+$/gm) || [];
  // Fallback: if no punctuation found, treat whole text as 1 sentence
  if (matches.length === 0 && text.trim().length > 0) return 1;
  return matches.length;
}

function fleschKincaidGradeLevel(text: string): number | null {
  const words = tokenizeWords(text);
  const totalWords = words.length;
  if (totalWords === 0) return null;

  const sentences = countSentences(text);
  if (sentences === 0) return null;

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  return (
    0.39 * (totalWords / sentences) +
    11.8 * (totalSyllables / totalWords) -
    15.59
  );
}

function gradeLabel(grade: number): string {
  if (grade <= 5) return 'Easy';
  if (grade <= 8) return 'Standard';
  if (grade <= 12) return 'Moderate';
  return 'Complex';
}

// ── Plugin activation ──────────────────────────────────────────────────────

export function activate(ctx: PluginContext): Disposable {
  // Create status bar element
  const el = document.createElement('span');
  el.className = 'ml-plugin-readability';
  el.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:0 8px;cursor:default;';

  const icon = document.createElement('span');
  icon.textContent = '📖';
  const label = document.createElement('span');
  label.textContent = '—';

  el.appendChild(icon);
  el.appendChild(label);

  const disposable = ctx.statusbar.addItem(el);

  function update() {
    const text = ctx.editor.getContent();
    const grade = fleschKincaidGradeLevel(text);
    if (grade === null) {
      label.textContent = '—';
      el.title = 'No text to analyze';
      return;
    }
    const g = Math.round(grade * 10) / 10;
    label.textContent = `Grade ${g}`;
    el.title = `Flesch-Kincaid Grade Level: ${g} (${gradeLabel(grade)})\nWords: ${tokenizeWords(text).length}`;
  }

  // Initial update
  update();

  // Watch editor content changes via a polling approach
  // (Plugin API doesn't expose onChange directly; poll every 500ms)
  let lastContent = ctx.editor.getContent();
  const timer = setInterval(() => {
    const current = ctx.editor.getContent();
    if (current !== lastContent) {
      lastContent = current;
      update();
    }
  }, 500);

  return {
    dispose() {
      clearInterval(timer);
      disposable.dispose();
    },
  };
}
