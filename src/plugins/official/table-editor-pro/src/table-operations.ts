/**
 * Table Editor Pro — Table data operations
 */
import type { TableData, Alignment } from '../../../../lib/markdown/table-parser';

/* ------------------------------------------------------------------ */
/*  Column sort                                                        */
/* ------------------------------------------------------------------ */

export function sortTableByColumn(data: TableData, col: number, dir: 'asc' | 'desc'): TableData {
  const sorted = [...data.rows].sort((a: string[], b: string[]) => {
    const cmp = (a[col] ?? '').localeCompare(b[col] ?? '', undefined, { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  });
  return { ...data, rows: sorted };
}

/* ------------------------------------------------------------------ */
/*  Row operations                                                     */
/* ------------------------------------------------------------------ */

export function insertRow(data: TableData, afterIndex: number): TableData {
  const colCount = Math.max(data.headers[0]?.length ?? 0, ...data.rows.map((r: string[]) => r.length));
  const emptyRow = Array.from({ length: colCount }, () => '');
  const rows = [...data.rows];
  rows.splice(afterIndex + 1, 0, emptyRow);
  return { ...data, rows };
}

export function deleteRows(data: TableData, indices: number[]): TableData {
  const set = new Set(indices);
  const rows = data.rows.filter((_: string[], i: number) => !set.has(i));
  return { ...data, rows };
}

export function moveRow(data: TableData, from: number, to: number): TableData {
  const rows = [...data.rows];
  const [moved] = rows.splice(from, 1);
  rows.splice(to, 0, moved);
  return { ...data, rows };
}

/* ------------------------------------------------------------------ */
/*  Column operations                                                  */
/* ------------------------------------------------------------------ */

export function insertColumn(data: TableData, afterIndex: number): TableData {
  const headers = data.headers.map((h: string[]) => {
    const copy = [...h];
    copy.splice(afterIndex + 1, 0, '');
    return copy;
  });
  const rows = data.rows.map((r: string[]) => {
    const copy = [...r];
    copy.splice(afterIndex + 1, 0, '');
    return copy;
  });
  const alignment = [...data.alignment];
  alignment.splice(afterIndex + 1, 0, 'left');
  return { ...data, headers, rows, alignment };
}

export function deleteColumn(data: TableData, index: number): TableData {
  const headers = data.headers.map((h: string[]) => h.filter((_: string, i: number) => i !== index));
  const rows = data.rows.map((r: string[]) => r.filter((_: string, i: number) => i !== index));
  const alignment = data.alignment.filter((_: Alignment, i: number) => i !== index);
  return { ...data, headers, rows, alignment };
}

export function setAlignment(data: TableData, col: number, align: Alignment): TableData {
  const alignment = [...data.alignment];
  while (alignment.length <= col) alignment.push('left');
  alignment[col] = align;
  return { ...data, alignment };
}
