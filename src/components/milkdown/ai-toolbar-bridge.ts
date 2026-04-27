/**
 * AI toolbar bridge — extends Milkdown Crepe's floating toolbar with
 * AI Polish / Rewrite buttons.  Buttons dispatch a CustomEvent so that
 * the React-side AI Copilot plugin can pick it up without any direct
 * coupling to the Vue-based Crepe toolbar.
 */
import type { ToolbarFeatureConfig } from '@milkdown/crepe/feature/toolbar';

// ── SVG Icons (24×24, same format as @milkdown/crepe icons) ─────────

/** Sparkles icon — used for "AI Polish" */
const sparklesIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

/** Rewrite / shuffle icon — used for "AI Rewrite" */
const rewriteIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M21 7H3M21 7l-3-3M21 7l-3 3M3 17h18M3 17l3-3M3 17l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

/** Globe icon — used for "AI Translate" */
const translateIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

/** List/summarize icon — used for "AI Summarize" */
const summarizeIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M4 6h16M4 12h10M4 18h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

// ── Custom event name ───────────────────────────────────────────────

export const AI_TOOLBAR_EVENT = 'ai-toolbar-action';

export interface AIToolbarEventDetail {
  command: '/polish' | '/rewrite' | '/translate' | '/summarize';
}

// ── Builder ─────────────────────────────────────────────────────────

/**
 * Crepe Toolbar configuration that appends AI Polish / Rewrite buttons.
 * Pass this as `featureConfigs[CrepeFeature.Toolbar].buildToolbar`.
 */
export const buildAIToolbar: NonNullable<ToolbarFeatureConfig['buildToolbar']> = (builder) => {
  builder
    .addGroup('ai', 'AI')
    .addItem('ai-polish', {
      icon: sparklesIcon,
      active: () => false,
      onRun: () => {
        document.dispatchEvent(
          new CustomEvent<AIToolbarEventDetail>(AI_TOOLBAR_EVENT, {
            detail: { command: '/polish' },
          }),
        );
      },
    })
    .addItem('ai-rewrite', {
      icon: rewriteIcon,
      active: () => false,
      onRun: () => {
        document.dispatchEvent(
          new CustomEvent<AIToolbarEventDetail>(AI_TOOLBAR_EVENT, {
            detail: { command: '/rewrite' },
          }),
        );
      },
    })
    .addItem('ai-translate', {
      icon: translateIcon,
      active: () => false,
      onRun: () => {
        document.dispatchEvent(
          new CustomEvent<AIToolbarEventDetail>(AI_TOOLBAR_EVENT, {
            detail: { command: '/translate' },
          }),
        );
      },
    })
    .addItem('ai-summarize', {
      icon: summarizeIcon,
      active: () => false,
      onRun: () => {
        document.dispatchEvent(
          new CustomEvent<AIToolbarEventDetail>(AI_TOOLBAR_EVENT, {
            detail: { command: '/summarize' },
          }),
        );
      },
    });
};
