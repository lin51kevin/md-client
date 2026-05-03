import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerPngExporter,
  unregisterPngExporter,
  getPngExporter,
  isPngExportAvailable,
} from '../../../../lib/export/png-bridge';

describe('png-bridge', () => {
  beforeEach(() => {
    unregisterPngExporter();
  });

  it('should return null when no exporter registered', () => {
    expect(getPngExporter()).toBeNull();
    expect(isPngExportAvailable()).toBe(false);
  });

  it('should return exporter after register', () => {
    const fn = vi.fn();
    registerPngExporter(fn);
    expect(getPngExporter()).toBe(fn);
    expect(isPngExportAvailable()).toBe(true);
  });

  it('should return null after unregister', () => {
    const fn = vi.fn();
    registerPngExporter(fn);
    unregisterPngExporter();
    expect(getPngExporter()).toBeNull();
    expect(isPngExportAvailable()).toBe(false);
  });

  it('isPngExportAvailable should reflect registration state', () => {
    expect(isPngExportAvailable()).toBe(false);
    registerPngExporter(vi.fn());
    expect(isPngExportAvailable()).toBe(true);
    unregisterPngExporter();
    expect(isPngExportAvailable()).toBe(false);
  });
});
