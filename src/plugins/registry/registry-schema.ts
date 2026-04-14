/**
 * Plugin Market Registry Schema
 * Phase 5 — Task O: Plugin Market Registry
 */

export interface RegistryPluginEntry {
  /** Unique plugin identifier, e.g. 'marklite-backlinks' */
  id: string;
  /** Display name */
  name: string;
  /** Semver version, e.g. '1.0.0' */
  version: string;
  /** Description (supports i18n) */
  description: string;
  /** Author name or team */
  author: string;
  /** Tags for categorization, e.g. ['wiki', 'backlinks', 'knowledge'] */
  tags: string[];
  /** Emoji or image URL */
  icon?: string;
  /** Manifest path relative to plugins/ directory */
  manifestUrl: string;
  /** Installed version (populated at runtime for installed plugins) */
  installedVersion?: string;
}

export interface RegistryManifest {
  /** Registry schema version */
  version: string;
  /** Last updated timestamp (ISO 8601) */
  updatedAt: string;
  /** Available plugins */
  plugins: RegistryPluginEntry[];
}
