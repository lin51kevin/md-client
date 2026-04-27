import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runSpringLayout, runSpringLayoutAsync } from '../../plugins/official/graph-view/src/spring-layout';
import type { LayoutEdge } from '../../plugins/official/graph-view/src/spring-layout';

// ── runSpringLayout (sync) ─────────────────────────────────────────────────

describe('runSpringLayout', () => {
  it('returns empty map for zero nodes', () => {
    const result = runSpringLayout([], [], 400, 300);
    expect(result.size).toBe(0);
  });

  it('returns a position for each node', () => {
    const ids = ['a', 'b', 'c'];
    const result = runSpringLayout(ids, [], 400, 300);
    expect(result.size).toBe(3);
    for (const id of ids) {
      const pos = result.get(id)!;
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    }
  });

  it('keeps all positions within bounds (padded)', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `node-${i}`);
    const edges: LayoutEdge[] = ids.slice(1).map((id) => ({ source: ids[0], target: id }));
    const result = runSpringLayout(ids, edges, 400, 300);
    for (const { x, y } of result.values()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(400);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(300);
    }
  });

  it('single node is placed at center', () => {
    const result = runSpringLayout(['solo'], [], 400, 300);
    const pos = result.get('solo')!;
    // Center is 200,150 — with gravity it should be close
    expect(pos.x).toBeGreaterThan(50);
    expect(pos.x).toBeLessThan(350);
    expect(pos.y).toBeGreaterThan(50);
    expect(pos.y).toBeLessThan(250);
  });
});

// ── runSpringLayoutAsync ──────────────────────────────────────────────────

describe('runSpringLayoutAsync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onUpdate at least once', () => {
    const onUpdate = vi.fn();
    runSpringLayoutAsync(['a', 'b'], [], 400, 300, onUpdate, { iterations: 10, batchSize: 5 });
    vi.runAllTimers();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('onUpdate receives positions for all nodes', () => {
    const positions = new Map<string, { x: number; y: number }>();
    runSpringLayoutAsync(['a', 'b', 'c'], [], 400, 300, (pos) => {
      pos.forEach((v, k) => positions.set(k, v));
    }, { iterations: 10, batchSize: 10 });
    vi.runAllTimers();
    expect(positions.size).toBe(3);
    for (const [, { x, y }] of positions) {
      expect(typeof x).toBe('number');
      expect(typeof y).toBe('number');
    }
  });

  it('cancel prevents further onUpdate calls', () => {
    const onUpdate = vi.fn();
    const cancel = runSpringLayoutAsync(
      ['a', 'b'],
      [],
      400, 300,
      onUpdate,
      { iterations: 100, batchSize: 1 },
    );
    // Advance one frame, then cancel
    vi.advanceTimersByTime(16);
    const countBeforeCancel = onUpdate.mock.calls.length;
    cancel();
    vi.runAllTimers();
    // No more calls after cancel
    expect(onUpdate.mock.calls.length).toBe(countBeforeCancel);
  });

  it('returns a cancel function', () => {
    const cancel = runSpringLayoutAsync(['a'], [], 400, 300, vi.fn());
    expect(typeof cancel).toBe('function');
    vi.runAllTimers();
  });

  it('handles zero nodes gracefully', () => {
    const onUpdate = vi.fn();
    runSpringLayoutAsync([], [], 400, 300, onUpdate);
    vi.runAllTimers();
    // Should call once with empty map
    expect(onUpdate).toHaveBeenCalledWith(new Map());
  });
});
