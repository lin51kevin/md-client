/**
 * Table Editor Pro — State management
 */
import type { TableData } from '../../../../lib/markdown/table-parser';

export interface TableProState {
  data: TableData | null;
  sortCol: number;
  sortDir: 'asc' | 'desc';
  selectedRows: Set<number>;
}

export function createState(): TableProState {
  return { data: null, sortCol: -1, sortDir: 'asc', selectedRows: new Set() };
}
