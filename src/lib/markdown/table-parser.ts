/**
 * GFM Markdown Table Parser & Serializer for marklite
 *
 * Parses standard GFM table syntax into structured data and back.
 */

export type Alignment = 'left' | 'center' | 'right';

export interface TableData {
  headers: string[][];
  rows: string[][];
  alignment: Alignment[];
  /** Start position (0-based) of the table raw text in source */
  rawStart: number;
  /** End position (exclusive) of the table raw text in source */
  rawEnd: number;
}

/** Split a table line by |, handling escaped pipes */
function splitCells(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '\\' && i + 1 < line.length && line[i + 1] === '|') {
      current += '|';
      i += 2;
    } else if (line[i] === '|') {
      cells.push(current.trim());
      current = '';
      i++;
    } else {
      current += line[i];
      i++;
    }
  }
  cells.push(current.trim());
  // Remove empty first/last cell from leading/trailing |
  if (cells.length > 1 && cells[0] === '') cells.shift();
  if (cells.length > 1 && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/** Detect alignment from a separator row like |---|:---:| */
function parseAlignmentRow(cells: string[]): Alignment[] {
  return cells.map((cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
    if (trimmed.endsWith(':')) return 'right';
    return 'left';
  });
}

/**
 * Try to parse a GFM table starting at or near `startPos` in `markdown`.
 * Returns structured data or null if no valid table found at that position.
 */
export function parseTable(markdown: string, startPos: number): TableData | null {
  const lines = markdown.split('\n');

  // Find which line contains startPos
  let startLineIdx = 0;
  let posAccum = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length + 1; // +1 for \n
    if (startPos >= posAccum && startPos < posAccum + lineLen) {
      startLineIdx = i;
      break;
    }
    posAccum += lineLen;
  }

  // Search backward to find a potential table start (header row with |)
  let headerIdx = startLineIdx;
  while (headerIdx >= 0 && !lines[headerIdx].includes('|')) headerIdx--;

  if (headerIdx < 0 || headerIdx + 1 >= lines.length) return null;

  // Check next line is separator
  const sepLine = lines[headerIdx + 1];
  if (!/^\|?[ \t]*(:?-+:?)[ \t]*(\|[ \t]*(:?-+:?)[ \t]*)*\|?[ \t]*$/.test(sepLine)) return null;

  // Parse header row
  const headerCells = splitCells(lines[headerIdx]);
  if (headerCells.length === 0) return null;

  // Parse alignment
  const sepCells = sepLine.split('|').map((c) => c.trim()).filter(Boolean);
  const alignment = parseAlignmentRow(sepCells);

  // Parse body rows until a non-table line
  const rows: string[][] = [];
  let endLineIdx = headerIdx + 1; // at least include header + sep
  for (let i = headerIdx + 2; i < lines.length; i++) {
    if (!lines[i].includes('|')) break;
    // Must have same number of columns (or close enough)
    const cells = splitCells(lines[i]);
    if (cells.length === 0 || cells.every((c) => c === '' && lines[i].trim() === '|')) break;
    rows.push(cells);
    endLineIdx = i;
  }

  // Calculate raw positions
  let rawStart = 0;
  for (let i = 0; i < headerIdx; i++) rawStart += lines[i].length + 1;
  let rawEnd = rawStart;
  for (let i = headerIdx; i <= endLineIdx; i++) rawEnd += lines[i].length + 1;

  return {
    headers: [headerCells],
    rows,
    alignment,
    rawStart,
    rawEnd,
  };
}

/** Escape pipe characters inside cell content */
function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|');
}

/**
 * Serialize TableData back to GFM Markdown string
 */
export function serializeTable(data: TableData): string {
  const { headers, rows, alignment } = data;
  const headerRow = headers[0] ?? [];
  const colCount = Math.max(headerRow.length, ...rows.map((r) => r.length), alignment.length);

  // Normalize column count
  while (headerRow.length < colCount) headerRow.push('');
  const normalizedAlignment = [...alignment];
  while (normalizedAlignment.length < colCount) normalizedAlignment.push('left');

  // Separator row
  const makeSep = (align: Alignment): string => {
    switch (align) {
      case 'center': return ':---:';
      case 'right': return '---:';
      default: return '---';
    }
  };

  // Build lines
  const headerLine = '| ' + headerRow.map(escapeCell).join(' | ') + ' |';
  const sepLine = '| ' + normalizedAlignment.map(makeSep).join(' | ') + ' |';
  const bodyLines = rows.map((row) => {
    const normRow = [...row];
    while (normRow.length < colCount) normRow.push('');
    return '| ' + normRow.map(escapeCell).join(' | ') + ' |';
  });

  return [headerLine, sepLine, ...bodyLines].join('\n');
}
