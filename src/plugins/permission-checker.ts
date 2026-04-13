import type { PluginPermission } from './permissions';

// ── Error ──────────────────────────────────────────────────────────────────

export class PluginPermissionError extends Error {
  public readonly permission: PluginPermission;

  constructor(permission: PluginPermission) {
    super(`Permission denied: ${permission}`);
    this.name = 'PluginPermissionError';
    this.permission = permission;
  }
}

// ── Checker ────────────────────────────────────────────────────────────────

export class PermissionChecker {
  private readonly granted = new Set<PluginPermission>();

  constructor(grantedPermissions: PluginPermission[] = []) {
    grantedPermissions.forEach(p => this.granted.add(p));
  }

  /** Check if a single permission is granted. */
  has(permission: PluginPermission): boolean {
    return this.granted.has(permission);
  }

  /** Return list of permissions that are missing from the granted set. */
  checkAll(required: PluginPermission[]): PluginPermission[] {
    return required.filter(p => !this.granted.has(p));
  }

  /** Assert a permission; throw PluginPermissionError if not granted. */
  assert(permission: PluginPermission): void {
    if (!this.granted.has(permission)) {
      throw new PluginPermissionError(permission);
    }
  }

  /** Grant additional permissions. */
  grant(permissions: PluginPermission[]): void {
    permissions.forEach(p => this.granted.add(p));
  }

  /** Revoke permissions. */
  revoke(permissions: PluginPermission[]): void {
    permissions.forEach(p => this.granted.delete(p));
  }

  /** Return all currently granted permissions. */
  getAll(): PluginPermission[] {
    return [...this.granted];
  }
}
