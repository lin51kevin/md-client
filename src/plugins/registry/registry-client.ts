/**
 * Registry Client — access the official plugin registry
 */
import type { RegistryManifest, RegistryPluginEntry } from './registry-schema';
import officialRegistry from './official-registry.json';

/** Get the full official registry manifest */
export function getOfficialRegistry(): RegistryManifest {
  return officialRegistry as RegistryManifest;
}

/** Get all official plugin entries */
export function getOfficialPlugins(): RegistryPluginEntry[] {
  return (officialRegistry as RegistryManifest).plugins;
}

/** Find a specific plugin by ID */
export function findPluginById(id: string): RegistryPluginEntry | undefined {
  return getOfficialPlugins().find((p) => p.id === id);
}
