/**
 * Tests for Table Editor Pro plugin
 */
import { parseTable, serializeTable } from '../../../../lib/markdown/table-parser';
import type { TableData } from '../../../../lib/markdown/table-parser';

/* ------------------------------------------------------------------ */
/*  Helpers matching index.ts logic                                    */
/* ------------------------------------------------------------------ */

function sortTableByColumn(data: TableData, col: number, dir: 'asc' | 'desc'): TableData {
  const sorted = [...data.rows].sort((a, b) => {
    const cmp = (a[col] ?? '').localeCompare(b[col] ?? '', undefined, { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  });
  return { ...data, rows: sorted };
}

function insertRow(data: TableData, afterIndex: number): TableData {
  const colCount = Math.max(data.headers[0]?.length ?? 0, ...data.rows.map(r => r.length));
  const rows = [...data.rows];
  rows.splice(afterIndex + 1, 0, Array.from({ length: colCount }, () => ''));
  return { ...data, rows };
}

function deleteRows(data: TableData, indices: number[]): TableData {
  const set = new Set(indices);
  return { ...data, rows: data.rows.filter((_, i) => !set.has(i)) };
}

function insertColumn(data: TableData, afterIndex: number): TableData {
  const headers = data.headers.map(h => { const c = [...h]; c.splice(afterIndex + 1, 0, ''); return c; });
  const rows = data.rows.map(r => { const c = [...r]; c.splice(afterIndex + 1, 0, ''); return c; });
  const alignment = [...data.alignment]; alignment.splice(afterIndex + 1, 0, 'left');
  return { ...data, headers, rows, alignment };
}

function deleteColumn(data: TableData, index: number): TableData {
  return {
    ...data,
    headers: data.headers.map(h => h.filter((_, i) => i !== index)),
    rows: data.rows.map(r => r.filter((_, i) => i !== index)),
    alignment: data.alignment.filter((_, i) => i !== index),
  };
}

function setAlignment(data: TableData, col: number, align: 'left' | 'center' | 'right'): TableData {
  const alignment = [...data.alignment];
  while (alignment.length <= col) alignment.push('left');
  alignment[col] = align;
  return { ...data, alignment };
}

function moveRow(data: TableData, from: number, to: number): TableData {
  const rows = [...data.rows];
  const [moved] = rows.splice(from, 1);
  rows.splice(to, 0, moved);
  return { ...data, rows };
}

/* ------------------------------------------------------------------ */
/*  Sample table                                                       */
/* ------------------------------------------------------------------ */

const SAMPLE_MD = `| Name | Age | City |
| --- | --- | --- |
| Alice | 30 | Beijing |
| Bob | 25 | Shanghai |
| Charlie | 35 | Guangzhou |`;

function getSampleTable(): TableData {
  const table = parseTable(SAMPLE_MD, 0);
  if (!table) throw new Error('Failed to parse sample table');
  return table;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Table Editor Pro', () => {
  describe('column alignment', () => {
    it('should set column to center alignment', () => {
      const data = getSampleTable();
      const updated = setAlignment(data, 0, 'center');
      expect(updated.alignment[0]).toBe('center');
      const md = serializeTable(updated);
      expect(md).toContain(':---:');
    });

    it('should set column to right alignment', () => {
      const data = getSampleTable();
      const updated = setAlignment(data, 1, 'right');
      expect(updated.alignment[1]).toBe('right');
      const md = serializeTable(updated);
      expect(md).toContain('---:');
    });

    it('should set column to left alignment (default)', () => {
      const data = getSampleTable();
      const updated = setAlignment(data, 0, 'left');
      expect(updated.alignment[0]).toBe('left');
      const md = serializeTable(updated);
      expect(md.split('\n')[1]).toMatch(/\| --- \|/);
    });

    it('should serialize correctly after alignment changes', () => {
      const data = getSampleTable();
      const updated = setAlignment(setAlignment(data, 0, 'center'), 2, 'right');
      const md = serializeTable(updated);
      const lines = md.split('\n');
      expect(lines[0]).toBe('| Name | Age | City |');
      // separator line
      expect(lines[1]).toContain(':---:');
      expect(lines[1]).toContain('---:');
      // header preserved
      expect(lines[2]).toContain('Alice');
    });
  });

  describe('row operations', () => {
    it('should insert a row after the given index', () => {
      const data = getSampleTable();
      expect(data.rows).toHaveLength(3);
      const updated = insertRow(data, 1);
      expect(updated.rows).toHaveLength(4);
      expect(updated.rows[2]).toEqual(['', '', '']);
    });

    it('should delete selected rows', () => {
      const data = getSampleTable();
      const updated = deleteRows(data, [0, 2]);
      expect(updated.rows).toHaveLength(1);
      expect(updated.rows[0][0]).toBe('Bob');
    });

    it('should move a row up', () => {
      const data = getSampleTable();
      const updated = moveRow(data, 2, 0);
      expect(updated.rows[0][0]).toBe('Charlie');
      expect(updated.rows[1][0]).toBe('Alice');
      expect(updated.rows[2][0]).toBe('Bob');
    });

    it('should move a row down', () => {
      const data = getSampleTable();
      const updated = moveRow(data, 0, 2);
      expect(updated.rows[0][0]).toBe('Bob');
      expect(updated.rows[1][0]).toBe('Charlie');
      expect(updated.rows[2][0]).toBe('Alice');
    });
  });

  describe('column operations', () => {
    it('should insert a column', () => {
      const data = getSampleTable();
      expect(data.headers[0]).toHaveLength(3);
      const updated = insertColumn(data, 1);
      expect(updated.headers[0]).toHaveLength(4);
      expect(updated.alignment).toHaveLength(4);
      expect(updated.alignment[2]).toBe('left'); // new column default
    });

    it('should delete a column', () => {
      const data = getSampleTable();
      const updated = deleteColumn(data, 1);
      expect(updated.headers[0]).toHaveLength(2);
      expect(updated.rows[0]).toHaveLength(2);
      expect(updated.headers[0]).toEqual(['Name', 'City']);
    });

    it('should preserve alignment after column deletion', () => {
      const data = setAlignment(getSampleTable(), 2, 'right');
      const updated = deleteColumn(data, 0);
      // alignment shifted: was [left, left, right], delete col 0 → [left, right]
      expect(updated.alignment).toHaveLength(2);
      expect(updated.alignment[1]).toBe('right');
    });
  });

  describe('sorting', () => {
    it('should sort rows ascending by column', () => {
      const data = getSampleTable();
      const updated = sortTableByColumn(data, 0, 'asc');
      expect(updated.rows[0][0]).toBe('Alice');
      expect(updated.rows[1][0]).toBe('Bob');
      expect(updated.rows[2][0]).toBe('Charlie');
    });

    it('should sort rows descending by column', () => {
      const data = getSampleTable();
      const updated = sortTableByColumn(data, 0, 'desc');
      expect(updated.rows[0][0]).toBe('Charlie');
      expect(updated.rows[1][0]).toBe('Bob');
      expect(updated.rows[2][0]).toBe('Alice');
    });

    it('should handle numeric sorting correctly', () => {
      const data = getSampleTable();
      const updated = sortTableByColumn(data, 1, 'asc');
      expect(updated.rows[0][1]).toBe('25');
      expect(updated.rows[1][1]).toBe('30');
      expect(updated.rows[2][1]).toBe('35');
    });
  });

  describe('Markdown format output', () => {
    it('should produce valid GFM table after operations', () => {
      const data = getSampleTable();
      const updated = insertRow(setAlignment(data, 0, 'center'), 0);
      const md = serializeTable(updated);
      const lines = md.split('\n');
      expect(lines).toHaveLength(5); // header + sep + 4 rows
      // Every line should start and end with |
      lines.forEach(line => {
        expect(line).toMatch(/^\|/);
        expect(line).toMatch(/\|$/);
      });
      // Separator line should have correct format
      expect(lines[1]).toMatch(/:\s*---\s*:/);
    });

    it('should round-trip: parse → modify → serialize → parse', () => {
      const data = getSampleTable();
      const modified = setAlignment(insertColumn(data, 0), 1, 'right');
      const md = serializeTable(modified);
      const reparsed = parseTable(md, 0);
      expect(reparsed).not.toBeNull();
      expect(reparsed!.headers[0]).toHaveLength(4);
      expect(reparsed!.alignment[1]).toBe('right');
      expect(reparsed!.rows).toHaveLength(3);
    });
  });
});
