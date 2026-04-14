/**
 * Quick install from a registry entry
 * Reads the plugin manifest and returns parsed data for the caller to add via usePlugins
 */
import type { RegistryPluginEntry } from './registry-schema';

export interface PartialManifest {
  id?: string;
  name?: string;
  version?: string;
  author?: string;
  description?: string;
  permissions?: string[];
}

/** Environment detection helpers */
function isTauri(): boolean {
  return typeof (window as Window & { __TAURI__?: unknown }).__TAURI__ !== 'undefined';
}

function isDev(): boolean {
  return import.meta.env.DEV;
}

/**
 * Get the appropriate base path for the current environment.
 * Handles dev, production (Vite build), and Tauri contexts.
 */
function getBasePath(): string {
  if (isTauri()) {
    // Tauri: try relative to app directory first, then absolute
    return isDev() ? 'src/' : '';
  }
  // Web: use Vite's base URL if set
  return import.meta.env.BASE_URL || '';
}

/**
 * Build path candidates in priority order for the current environment.
 * This resolves the inconsistency between `/plugins/` vs `src/plugins/` across
 * development, production, and Tauri contexts.
 */
function buildPathCandidates(manifestUrl: string): string[] {
  const cleanUrl = manifestUrl.replace(/^\.\//, '');
  const basePath = getBasePath();
  const candidates: string[] = [];

  if (isTauri()) {
    // Tauri context (dev or production)
    // Priority: src/plugins/ (dev) -> plugins/ (production) -> absolute /plugins/
    if (isDev()) {
      candidates.push(`src/plugins/${cleanUrl}`);
      candidates.push(`plugins/${cleanUrl}`);
    } else {
      candidates.push(`plugins/${cleanUrl}`);
    }
    // Also try absolute path as fallback
    candidates.push(`/plugins/${cleanUrl}`);
  } else {
    // Web context (dev server or production build)
    candidates.push(`${basePath}plugins/${cleanUrl}`);
    candidates.push(`${basePath}src/plugins/${cleanUrl}`);
    candidates.push(`plugins/${cleanUrl}`);
    candidates.push(`src/plugins/${cleanUrl}`);
  }

  return candidates;
}

/**
 * Read the manifest file for a registry entry
 * Returns parsed manifest data that can be passed to addPluginFromManifest
 */
export async function readRegistryManifest(entry: RegistryPluginEntry): Promise<PartialManifest | null> {
  const possiblePaths = buildPathCandidates(entry.manifestUrl);

  console.log(`[registry] Environment: Tauri=${isTauri()}, DEV=${isDev()}, BASE_URL=${import.meta.env.BASE_URL}`);
  console.log(`[registry] Trying paths for "${entry.id}":`, possiblePaths);

  // Try Tauri FS first (if available)
  if (isTauri()) {
    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');

      for (const manifestPath of possiblePaths) {
        try {
          console.log(`[registry] Tauri FS: trying ${manifestPath}`);
          const content = await readTextFile(manifestPath);
          console.log(`[registry] Tauri FS: found at ${manifestPath}`);
          return JSON.parse(content) as PartialManifest;
        } catch (err) {
          // Path not found, try next
          console.log(`[registry] Tauri FS: not found at ${manifestPath}`);
          continue;
        }
      }

      console.error(`[registry] Tauri FS: Could not find manifest for ${entry.id}`);
      return null;
    } catch (err) {
      console.warn(`[registry] Tauri FS API failed: ${err}, falling back to web fetch`);
    }
  }

  // Fallback: fetch via HTTP (web context or Tauri webview)
  for (const manifestPath of possiblePaths) {
    try {
      console.log(`[registry] Web fetch: trying ${manifestPath}`);
      const resp = await fetch(manifestPath);
      if (resp.ok) {
        const content = await resp.text();
        console.log(`[registry] Web fetch: found at ${manifestPath}`);
        return JSON.parse(content) as PartialManifest;
      }
      console.log(`[registry] Web fetch: ${resp.status} at ${manifestPath}`);
    } catch (err) {
      console.log(`[registry] Web fetch: error at ${manifestPath}: ${err}`);
      continue;
    }
  }

  console.error(`[registry] Could not fetch manifest for ${entry.id} from any path`);
  return null;
}
