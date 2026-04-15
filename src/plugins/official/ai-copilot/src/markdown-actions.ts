import type { EditAction } from './providers/types';

interface MarkdownSection {
  heading: string;
  text: string;
  start: number;
  end: number;
}

export interface CreateMarkdownSectionActionsInput {
  original: string;
  modified: string;
  baseFrom: number;
  filePath: string | null;
  idFactory: (idx: number) => string;
}

function parseSections(markdown: string): MarkdownSection[] {
  const headingRegex = /^#{1,6}\s+.+$/gm;
  const sections: MarkdownSection[] = [];
  const matches = Array.from(markdown.matchAll(headingRegex));

  if (matches.length < 2) return [];

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? markdown.length) : markdown.length;
    const heading = match[0].replace(/^#{1,6}\s+/, '').trim();
    sections.push({
      heading,
      start,
      end,
      text: markdown.slice(start, end),
    });
  }

  return sections;
}

export function createMarkdownSectionActions(input: CreateMarkdownSectionActionsInput): EditAction[] {
  const { original, modified, baseFrom, filePath, idFactory } = input;
  const originalSections = parseSections(original);
  const modifiedSections = parseSections(modified);

  if (originalSections.length === 0 || modifiedSections.length === 0) {
    return [
      {
        id: idFactory(0),
        type: 'replace',
        description: '替换全文',
        from: baseFrom,
        to: baseFrom + original.length,
        originalText: original,
        newText: modified,
        sourceFilePath: filePath,
      },
    ];
  }

  const matchedModifiedIndices = new Set<number>();
  const actions: EditAction[] = [];

  for (let i = 0; i < originalSections.length; i += 1) {
    const oldSection = originalSections[i];
    let newSectionIndex = modifiedSections.findIndex(
      (s, idx) => !matchedModifiedIndices.has(idx) && s.heading === oldSection.heading,
    );
    if (newSectionIndex < 0 && i < modifiedSections.length && !matchedModifiedIndices.has(i)) {
      newSectionIndex = i;
    }
    if (newSectionIndex < 0) continue;
    const newSection = modifiedSections[newSectionIndex];
    matchedModifiedIndices.add(newSectionIndex);
    if (oldSection.text === newSection.text) continue;

    actions.push({
      id: idFactory(i),
      type: 'replace',
      description: `替换章节: ${oldSection.heading || `Section ${i + 1}`}`,
      from: baseFrom + oldSection.start,
      to: baseFrom + oldSection.end,
      originalText: oldSection.text,
      newText: newSection.text,
      sourceFilePath: filePath,
    });
  }

  if (actions.length > 0) return actions;

  return [
    {
      id: idFactory(0),
      type: 'replace',
      description: '替换全文',
      from: baseFrom,
      to: baseFrom + original.length,
      originalText: original,
      newText: modified,
      sourceFilePath: filePath,
    },
  ];
}
