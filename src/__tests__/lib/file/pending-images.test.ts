import { describe, it, expect, beforeEach } from 'vitest';
import {
  addPendingImage,
  getPendingImages,
  clearPendingImages,
  hasPendingImages,
} from '../../../lib/file';

describe('pending-images', () => {
  beforeEach(() => {
    // 确保每个测试从干净状态开始
    clearPendingImages('tab-1');
    clearPendingImages('tab-2');
  });

  it('returns empty array for unknown tab', () => {
    expect(getPendingImages('nonexistent')).toEqual([]);
  });

  it('hasPendingImages returns false for unknown tab', () => {
    expect(hasPendingImages('nonexistent')).toBe(false);
  });

  it('adds and retrieves pending images', () => {
    addPendingImage('tab-1', { absolutePath: '/tmp/img-1.png', fileName: 'img-1.png', isTemp: true });
    const images = getPendingImages('tab-1');
    expect(images).toHaveLength(1);
    expect(images[0]).toEqual({ absolutePath: '/tmp/img-1.png', fileName: 'img-1.png', isTemp: true });
  });

  it('accumulates multiple images for same tab', () => {
    addPendingImage('tab-1', { absolutePath: '/tmp/img-1.png', fileName: 'img-1.png', isTemp: true });
    addPendingImage('tab-1', { absolutePath: '/tmp/img-2.jpg', fileName: 'img-2.jpg', isTemp: true });
    expect(getPendingImages('tab-1')).toHaveLength(2);
  });

  it('tracks images per tab independently', () => {
    addPendingImage('tab-1', { absolutePath: '/tmp/a.png', fileName: 'a.png', isTemp: true });
    addPendingImage('tab-2', { absolutePath: '/tmp/b.png', fileName: 'b.png', isTemp: false });
    expect(getPendingImages('tab-1')).toHaveLength(1);
    expect(getPendingImages('tab-2')).toHaveLength(1);
    expect(getPendingImages('tab-1')[0].fileName).toBe('a.png');
    expect(getPendingImages('tab-2')[0].fileName).toBe('b.png');
  });

  it('hasPendingImages returns true when images exist', () => {
    addPendingImage('tab-1', { absolutePath: '/tmp/x.png', fileName: 'x.png', isTemp: true });
    expect(hasPendingImages('tab-1')).toBe(true);
  });

  it('clearPendingImages removes all images for a tab', () => {
    addPendingImage('tab-1', { absolutePath: '/tmp/a.png', fileName: 'a.png', isTemp: true });
    addPendingImage('tab-1', { absolutePath: '/tmp/b.png', fileName: 'b.png', isTemp: true });
    clearPendingImages('tab-1');
    expect(getPendingImages('tab-1')).toEqual([]);
    expect(hasPendingImages('tab-1')).toBe(false);
  });

  it('clearPendingImages does not affect other tabs', () => {
    addPendingImage('tab-1', { absolutePath: '/tmp/a.png', fileName: 'a.png', isTemp: true });
    addPendingImage('tab-2', { absolutePath: '/tmp/b.png', fileName: 'b.png', isTemp: true });
    clearPendingImages('tab-1');
    expect(getPendingImages('tab-2')).toHaveLength(1);
  });

  it('does not mutate previously returned arrays', () => {
    addPendingImage('tab-1', { absolutePath: '/tmp/a.png', fileName: 'a.png', isTemp: true });
    const first = getPendingImages('tab-1');
    addPendingImage('tab-1', { absolutePath: '/tmp/b.png', fileName: 'b.png', isTemp: true });
    const second = getPendingImages('tab-1');
    // first snapshot should not be affected by second add (immutable)
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(2);
  });

  it('preserves isTemp flag correctly', () => {
    addPendingImage('tab-1', { absolutePath: 'C:\\Users\\img.png', fileName: 'img.png', isTemp: false });
    addPendingImage('tab-1', { absolutePath: '/tmp/marklite/img2.png', fileName: 'img2.png', isTemp: true });
    const images = getPendingImages('tab-1');
    expect(images[0].isTemp).toBe(false);
    expect(images[1].isTemp).toBe(true);
  });
});
