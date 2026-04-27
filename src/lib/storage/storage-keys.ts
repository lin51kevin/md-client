/**
 * Centralized localStorage key registry for MarkLite.
 *
 * All storage keys used across the app are defined here.
 * This prevents typos, key collisions, and aids future migration.
 */
export const StorageKeys = {
  // ── UI State ─────────────────────────────────────────────────────────────
  VIEW_MODE: 'marklite-view-mode',
  AI_PANEL: 'marklite-ai-panel',
  ACTIVE_PANEL: 'marklite-active-panel',
  PANEL_ORDER: 'marklite-panel-order',
  FLOATING_PANEL: 'marklite-floating-panel',
  SPLIT_SIZES: 'marklite-split-sizes',
  /** @deprecated Use SPLIT_SIZES; kept for potential migration */
  SIDEBAR_WIDTH_LEGACY: 'marklite-sidebar-width',

  // ── File Tree ─────────────────────────────────────────────────────────────
  FILETREE_ROOT: 'marklite-filetree-root',
  FILETREE_EXPANDED: 'marklite-filetree-expanded',

  // ── Editor / Session ──────────────────────────────────────────────────────
  SESSION_TABS: 'marklite-session-tabs',
  CODEBLOCK_FOLD: 'marklite-codeblock-fold',
  TYPEWRITER_OPTIONS: 'marklite-typewriter-options',

  // ── Preferences ───────────────────────────────────────────────────────────
  SPELLCHECK: 'marklite-spellcheck',
  VIM_MODE: 'marklite-vimmode',
  AUTO_SAVE: 'marklite-autosave',
  AUTO_SAVE_DELAY: 'marklite-autosave-delay',
  AUTO_UPDATE_CHECK: 'marklite-auto-update-check',
  UPDATE_CHECK_FREQUENCY: 'marklite-update-check-frequency',
  GIT_MD_ONLY: 'marklite-git-md-only',
  MILKDOWN_PREVIEW: 'marklite-milkdown-preview',
  FILE_WATCH: 'marklite-file-watch',
  FILE_WATCH_BEHAVIOR: 'marklite-file-watch-behavior',

  // ── Theme ─────────────────────────────────────────────────────────────────
  THEME: 'marklite-theme',
  THEME_PREFERENCE: 'marklite-theme-preference',
  PREVIEW_THEME: 'marklite-preview-theme',
  CUSTOM_THEMES: 'marklite-themes',
  CUSTOM_CSS: 'marklite-custom-css',
  CSS_TEMPLATES: 'marklite-css-templates',

  // ── Plugins ───────────────────────────────────────────────────────────────
  INSTALLED_PLUGINS: 'marklite-installed-plugins',
  /** @deprecated Old key; kept for migration logic in usePlugins */
  INSTALLED_PLUGINS_LEGACY: 'marklite-ui-plugins',

  // ── Files & Commands ─────────────────────────────────────────────────────
  RECENT_FILES: 'marklite-recent-files',
  RECENT_COMMANDS: 'marklite-recent-commands',
  SNIPPETS: 'marklite-snippets',
  CUSTOM_SHORTCUTS: 'marklite-custom-shortcuts',

  // ── App ───────────────────────────────────────────────────────────────────
  LOCALE: 'marklite-locale',
  LAST_UPDATE_CHECK: 'marklite-last-update-check',
  WELCOME_DISMISSED: 'marklite-welcome-dismissed',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
