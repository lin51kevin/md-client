import { describe, it, expect, beforeEach } from 'vitest';
import { formatDuration } from '../../../lib/utils';

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(59000)).toBe('59s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(3599000)).toBe('59m 59s');
  });

  it('should format hours', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
    expect(formatDuration(3661000)).toBe('1h 1m');
    expect(formatDuration(7320000)).toBe('2h 2m');
  });
});
