import type { ActivationEvent } from './types';
import { PluginRegistry } from './plugin-registry';
import { PluginStorage } from './plugin-storage';
import { loadPluginModule } from './plugin-loader';

export class PluginLifecycle {
  private registry: PluginRegistry;
  private storage: PluginStorage;

  constructor(registry: PluginRegistry, storage: PluginStorage) {
    this.registry = registry;
    this.storage = storage;
  }

  async activate(id: string): Promise<void> {
    const instance = this.registry.get(id);
    if (!instance) {
      console.warn(`[PluginHost] Cannot activate unknown plugin "${id}"`);
      return;
    }

    // 如果还没有 activate 方法，尝试加载模块
    if (!instance.activate) {
      const mod = await loadPluginModule(instance.manifest);
      instance.activate = mod.activate;
      instance.deactivate = mod.deactivate;
    }

    try {
      if (instance.activate) {
        await instance.activate();
      }
      instance.status = 'active';
      this.storage.updatePlugin(id, { enabled: true });
    } catch (err) {
      instance.status = 'error';
      console.warn(
        `[PluginHost] Plugin "${id}" activation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async deactivate(id: string): Promise<void> {
    const instance = this.registry.get(id);
    if (!instance) {
      console.warn(`[PluginHost] Cannot deactivate unknown plugin "${id}"`);
      return;
    }

    try {
      if (instance.deactivate) {
        await instance.deactivate();
      }
      instance.status = 'disabled';
      this.storage.updatePlugin(id, { enabled: false });
    } catch (err) {
      instance.status = 'error';
      console.warn(
        `[PluginHost] Plugin "${id}" deactivation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async activateByEvent(event: ActivationEvent): Promise<void[]> {
    const candidates = this.registry.getByActivation(event);
    const results = await Promise.allSettled(
      candidates.map((p) => this.activate(p.manifest.id)),
    );
    return results.map((r) => {
      if (r.status === 'rejected') {
        console.warn(`[PluginHost] activateByEvent error: ${r.reason}`);
      }
      return undefined;
    });
  }

  async activateAll(): Promise<void[]> {
    const records = this.storage.getInstalledPlugins();
    const enabled = records.filter((r) => r.enabled);

    for (const record of enabled) {
      // 确保注册表中存在
      if (!this.registry.get(record.id)) {
        this.registry.register(record.manifest, record.grantedPermissions);
      }
    }

    const results = await Promise.allSettled(
      enabled.map((r) => this.activate(r.id)),
    );
    return results.map((r) => {
      if (r.status === 'rejected') {
        console.warn(`[PluginHost] activateAll error: ${r.reason}`);
      }
      return undefined;
    });
  }
}
