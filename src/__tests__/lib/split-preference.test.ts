import { describe, it, expect, beforeEach } from 'vitest';
import { getSavedSplitSizes, saveSplitSizes } from '../../lib/split-preference';

const STORAGE_KEY = 'marklite-split-sizes';

describe('getSavedSplitSizes', () => {
  beforeEach(() => localStorage.clear());

  it('returns [50, 50] when nothing stored', () => {
    expect(getSavedSplitSizes()).toEqual([50, 50]);
  });

  it('returns valid stored sizes', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([30, 70]));
    expect(getSavedSplitSizes()).toEqual([30, 70]);
  });

  it('returns [50, 50] when JSON is invalid', () => {
    localStorage.setItem(STORAGE_KEY, 'bad{json');
    expect(getSavedSplitSizes()).toEqual([50, 50]);
  });

  it('returns [50, 50] when stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 50, b: 50 }));
    expect(getSavedSplitSizes()).toEqual([50, 50]);
  });

  it('returns [50, 50] when array length is not 2', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([33, 33, 34]));
    expect(getSavedSplitSizes()).toEqual([50, 50]);
  });

  it('returns [50, 50] when sum deviates from 100 by more than 0.5', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([40, 55])); // sum = 95
    expect(getSavedSplitSizes()).toEqual([50, 50]);
  });

  it('returns [50, 50] when a value is below 10', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([5, 95]));
    expect(getSavedSplitSizes()).toEqual([50, 50]);
  });

  it('returns [50, 50] when a value exceeds 90', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([91, 9]));
    expect(getSavedSplitSizes()).toEqual([50, 50]);
  });

  it('returns [50, 50] when values are NaN', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['abc', 'def']));
    expect(getSavedSplitSizes()).toEqual([50, 50]);
  });

  it('accepts boundary values [10, 90]', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([10, 90]));
    expect(getSavedSplitSizes()).toEqual([10, 90]);
  });

  it('accepts boundary values [90, 10]', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([90, 10]));
    expect(getSavedSplitSizes()).toEqual([90, 10]);
  });

  it('second value is always 100 - first (corrects floating point)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([33.3, 66.7]));
    const [a, b] = getSavedSplitSizes();
    expect(a + b).toBeCloseTo(100, 5);
    expect(b).toBeCloseTo(100 - a, 5);
  });
});

describe('saveSplitSizes', () => {
  beforeEach(() => localStorage.clear());

  it('persists sizes to localStorage', () => {
    saveSplitSizes([40, 60]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[40,60]');
  });

  it('persisted value is read back by getSavedSplitSizes', () => {
    saveSplitSizes([25, 75]);
    expect(getSavedSplitSizes()).toEqual([25, 75]);
  });
});
