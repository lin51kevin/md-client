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

/**
 * Read the manifest file for a registry entry
 * Returns parsed manifest data that can be passed to addPluginFromManifest
 */
export async function readRegistryManifest(entry: RegistryPluginEntry): Promise<PartialManifest | null> {
  const manifestPath = `plugins/${entry.manifestUrl}`;
  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const content = await readTextFile(manifestPath);
    return JSON.parse(content) as PartialManifest;
  } catch {
    // Fallback: fetch via static assets (web context)
    try {
      const resp = await fetch(manifestPath);
      const content = await resp.text();
      return JSON.parse(content) as PartialManifest;
    } catch {
      console.error(`[registry] Failed to read manifest for ${entry.id} at ${manifestPath}`);
      return null;
    }
  }
}
