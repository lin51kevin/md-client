import type {
  ActivationEvent,
  PluginInstance,
  PluginManifest,
  PluginPermission,
} from './types';

export class PluginRegistry {
  private plugins = new Map<string, PluginInstance>();

  register(
    manifest: PluginManifest,
    grantedPermissions: PluginPermission[],
  ): PluginInstance {
    const instance: PluginInstance = {
      manifest,
      status: 'installed',
      grantedPermissions,
    };
    this.plugins.set(manifest.id, instance);
    return instance;
  }

  unregister(id: string): void {
    this.plugins.delete(id);
  }

  get(id: string): PluginInstance | undefined {
    return this.plugins.get(id);
  }

  getAll(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getActive(): PluginInstance[] {
    return this.getAll().filter((p) => p.status === 'active');
  }

  getByActivation(event: ActivationEvent): PluginInstance[] {
    return this.getAll().filter((p) =>
      p.manifest.activationEvents.includes(event),
    );
  }
}
