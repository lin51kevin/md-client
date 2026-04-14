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
  // Clean manifest URL (remove leading ./ if present)
  const cleanManifestUrl = entry.manifestUrl.replace(/^\.\//, '');
  
  // For development vs production path resolution
  const possiblePaths = [];
  
  // Development paths
  possiblePaths.push(`src/plugins/${cleanManifestUrl}`);
  possiblePaths.push(`plugins/${cleanManifestUrl}`);
  
  // Tauri app paths (absolute or relative to app directory)
  if (typeof (window as Window & { __TAURI__?: unknown }).__TAURI__ !== 'undefined') {
    possiblePaths.push(`/plugins/${cleanManifestUrl}`);
  }
  
  // Web build paths
  const baseUrl = import.meta.env.BASE_URL || '';
  possiblePaths.push(`${baseUrl}/plugins/${cleanManifestUrl}`);
  possiblePaths.push(`${baseUrl}/src/plugins/${cleanManifestUrl}`);
  
  // Try Tauri FS first (if available)
  if (typeof (window as Window & { __TAURI__?: unknown }).__TAURI__ !== 'undefined') {
    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      
      for (const manifestPath of possiblePaths) {
        try {
          console.log(`[registry] Tauri: trying ${manifestPath}`);
          const content = await readTextFile(manifestPath);
          return JSON.parse(content) as PartialManifest;
        } catch (err) {
          // Try next path
          continue;
        }
      }
      
      console.error(`[registry] Tauri: Could not find manifest for ${entry.id} at any path`);
      return null;
    } catch (err) {
      console.warn(`[registry] Tauri API not available or failed: ${err}`);
      // Fall through to web fetch
    }
  }
  
  // Fallback: fetch via static assets (web context)
  for (const manifestPath of possiblePaths) {
    try {
      console.log(`[registry] Web: trying ${manifestPath}`);
      const resp = await fetch(manifestPath);
      if (resp.ok) {
        const content = await resp.text();
        return JSON.parse(content) as PartialManifest;
      }
    } catch (err) {
      // Try next path
      continue;
    }
  }
  
  console.error(`[registry] Web: Could not fetch manifest for ${entry.id} from any path`);
  return null;
}