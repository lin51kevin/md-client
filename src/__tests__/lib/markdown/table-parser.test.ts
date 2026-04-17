import { describe, it, expect } from 'vitest';
import { parseTable, serializeTable } from '../../../lib/markdown';

describe('table-parser', () => {
  const BASIC_TABLE = `| Name | Age | City |
| --- | --- | --- |
| Alice | 30 | Beijing |
| Bob | 25 | Shanghai |`;

  it('parses a basic GFM table', () => {
    const result = parseTable(BASIC_TABLE, 0);
    expect(result).not.toBeNull();
    expect(result!.headers).toEqual([['Name', 'Age', 'City']]);
    expect(result!.rows).toEqual([
      ['Alice', '30', 'Beijing'],
      ['Bob', '25', 'Shanghai'],
    ]);
    expect(result!.alignment).toEqual(['left', 'left', 'left']);
  });

  it('parses alignment correctly', () => {
    const t = `| Name | Score | Notes |
| :--- | :---: | ---: |
| Alice | 90 | good |
| Bob | 85 | ok |`;
    const r = parseTable(t, 0);
    expect(r).not.toBeNull();
    expect(r!.alignment).toEqual(['left', 'center', 'right']);
  });

  it('serializes back to valid markdown (round-trip)', () => {
    const parsed = parseTable(BASIC_TABLE, 0);
    expect(parsed).not.toBeNull();
    const serialized = serializeTable(parsed!);
    // Re-parse should yield same data
    const reParsed = parseTable(serialized + '\nmore text', 0);
    expect(reParsed).not.toBeNull();
    expect(reParsed!.headers[0]).toEqual(parsed!.headers[0]);
    expect(reParsed!.rows).toEqual(parsed!.rows);
    expect(reParsed!.alignment).toEqual(parsed!.alignment);
  });

  it('handles single row table', () => {
    const t = `| A | B |
| - | - |`;
    const r = parseTable(t, 0);
    expect(r).not.toBeNull();
    expect(r!.headers).toEqual([['A', 'B']]);
    expect(r!.rows).toEqual([]);
  });

  it('handles empty cells', () => {
    const t = `| X | | Z |
| -- | -- | -- |
| a | | c |`;
    const r = parseTable(t, 0);
    expect(r).not.toBeNull();
    expect(r!.headers[0][1]).toBe('');
    expect(r!.rows[0][1]).toBe('');
  });

  it('handles tables without leading/trailing pipes', () => {
    const t = `Name | Age
--- | ---
Alice | 30`;
    const r = parseTable(t, 0);
    expect(r).not.toBeNull();
    expect(r!.headers[0]).toEqual(['Name', 'Age']);
  });

  it('returns null for non-table content', () => {
    expect(parseTable('just some text', 0)).toBeNull();
    expect(parseTable('# Heading\n\nparagraph', 0)).toBeNull();
  });

  it('preserves position info', () => {
    const prefix = '# Title\n\n';
    const full = prefix + BASIC_TABLE;
    const r = parseTable(full, prefix.length);
    expect(r).not.toBeNull();
    expect(r!.rawStart).toBe(prefix.length);
    expect(r!.rawEnd).toBeGreaterThan(prefix.length);
  });

  it('serialize handles added rows and columns', () => {
    const parsed = parseTable(BASIC_TABLE, 0)!;
    parsed.rows.push(['Charlie', '28', 'Guangzhou']);
    parsed.headers[0].push('Email');
    parsed.alignment.push('left');
    const s = serializeTable(parsed);
    expect(s).toContain('Charlie');
    expect(s).toContain('Email');
  });
});
