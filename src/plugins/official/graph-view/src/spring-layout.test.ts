import { describe, it, expect, vi } from 'vitest';
import { runSpringLayout, runSpringLayoutAsync } from './spring-layout';

describe('runSpringLayout', () => {
  it('returns empty map for empty nodes', () => {
    expect(runSpringLayout([], [], 800, 600)).toEqual(new Map());
  });

  it('places single node near center', () => {
    const result = runSpringLayout(['a'], [], 800, 600);
    const pos = result.get('a')!;
    expect(Math.abs(pos.x - 400)).toBeLessThan(50);
    expect(Math.abs(pos.y - 300)).toBeLessThan(50);
  });

  it('separates connected nodes', () => {
    const result = runSpringLayout(['a', 'b'], [{ source: 'a', target: 'b' }], 800, 600, 300);
    const posA = result.get('a')!;
    const posB = result.get('b')!;
    const dist = Math.sqrt((posA.x - posB.x) ** 2 + (posA.y - posB.y) ** 2);
    expect(dist).toBeGreaterThan(1);
  });

  it('warns when node count exceeds threshold', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    const nodes = Array.from({ length: 101 }, (_, i) => `n${i}`);
    runSpringLayout(nodes, [], 800, 600, 10);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('100'),
    );
    consoleWarnSpy.mockRestore();
  });

  it('does not warn when node count is below threshold', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    const nodes = Array.from({ length: 50 }, (_, i) => `n${i}`);
    runSpringLayout(nodes, [], 800, 600, 10);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('skips invalid edges gracefully', () => {
    const result = runSpringLayout(
      ['a', 'b'],
      [{ source: 'a', target: 'nonexistent' }, { source: 'a', target: 'b' }],
      800, 600, 50,
    );
    expect(result.size).toBe(2);
  });

  it('performance: handles 200 nodes in reasonable time', () => {
    const nodes = Array.from({ length: 200 }, (_, i) => `n${i}`);
    const edges = Array.from({ length: 300 }, (_, i) => ({
      source: `n${i % 200}`,
      target: `n${(i + 1) % 200}`,
    }));
    const start = performance.now();
    runSpringLayout(nodes, edges, 800, 600, 150);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000); // Should be fast with grid optimization
  });
});

describe('runSpringLayoutAsync', () => {
  it('calls onUpdate and returns cancel function', () => {
    vi.useFakeTimers();
    const onUpdate = vi.fn();
    const cancel = runSpringLayoutAsync(
      ['a', 'b'],
      [{ source: 'a', target: 'b' }],
      800, 600,
      onUpdate,
      { iterations: 10, batchSize: 5 },
    );
    // Advance a few frames
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(16);
    }
    expect(onUpdate).toHaveBeenCalled();
    cancel();
    const callCountBefore = onUpdate.mock.calls.length;
    vi.advanceTimersByTime(100);
    expect(onUpdate.mock.calls.length).toBe(callCountBefore); // No more calls after cancel
    vi.useRealTimers();
  });

  it('handles empty nodes', () => {
    const onUpdate = vi.fn();
    const cancel = runSpringLayoutAsync([], [], 800, 600, onUpdate);
    expect(onUpdate).toHaveBeenCalledWith(new Map());
    cancel();
  });
});
