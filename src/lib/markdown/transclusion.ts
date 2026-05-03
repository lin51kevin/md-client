/**
 * Transclusion support: resolve `![[file]]` and `![[file#heading]]` syntax.
 *
 * The function replaces transclusion markers with the content of the referenced
 * file (optionally extracting a specific heading section).
 * Recursive transclusions are prevented via maxDepth (default 3).
 */

const TRANSCLUSION_RE = /!\[\[([^\]#]+?)(?:#([^\]]+?))?\]\]/g;
const DEFAULT_MAX_DEPTH = 3;

/**
 * Extract the section under a specific heading from markdown content.
 * Supports ATX-style headings (`## Title`) and setext-style (`Title\n====`).
 * Returns the heading line + all content until the next heading of equal or higher level.
 */
export function extractHeadingSection(content: string, heading: string): string {
  const normalizedHeading = heading.trim().toLowerCase();
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // ATX heading
    const atxMatch = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (atxMatch && atxMatch[2].trim().toLowerCase() === normalizedHeading) {
      const level = atxMatch[1].length;
      const sectionLines: string[] = [lines[i]];
      for (let j = i + 1; j < lines.length; j++) {
        // Check if next line is a heading of equal or higher level
        const nextAtx = lines[j].match(/^(#{1,6})\s+/);
        if (nextAtx && nextAtx[1].length <= level) break;
        sectionLines.push(lines[j]);
      }
      return sectionLines.join('\n');
    }

    // Setext heading (h1/h2 only)
    if (i + 1 < lines.length) {
      const setextLine = lines[i + 1];
      if (/^={3,}\s*$/.test(setextLine) || /^-{3,}\s*$/.test(setextLine)) {
        if (lines[i].trim().toLowerCase() === normalizedHeading) {
          const level = setextLine[0] === '=' ? 1 : 2;
          const sectionLines: string[] = [lines[i], lines[i + 1]];
          for (let j = i + 2; j < lines.length; j++) {
            const nextAtx = lines[j].match(/^(#{1,6})\s+/);
            if (nextAtx && nextAtx[1].length <= level) break;
            if (j + 1 < lines.length) {
              const nextSetext = lines[j + 1];
              if (/^={3,}\s*$/.test(nextSetext) || /^-{3,}\s*$/.test(nextSetext)) break;
            }
            sectionLines.push(lines[j]);
          }
          return sectionLines.join('\n');
        }
      }
    }
  }

  return '';
}

/**
 * Resolve all transclusion markers in the given markdown content.
 *
 * @param markdown - Source markdown containing `![[file]]` or `![[file#heading]]` markers
 * @param readFile - Async function to read a file by its resolved path; returns null if not found
 * @param workspaceRoot - Absolute path to the workspace root for resolving relative file references
 * @param maxDepth - Maximum recursion depth (default 3)
 * @returns Markdown with all transclusions resolved
 */
export async function resolveTransclusions(
  markdown: string,
  readFile: (path: string) => Promise<string | null>,
  workspaceRoot: string,
  maxDepth: number = DEFAULT_MAX_DEPTH,
): Promise<string> {
  if (maxDepth <= 0) return markdown;

  const matches = [...markdown.matchAll(TRANSCLUSION_RE)];
  if (matches.length === 0) return markdown;

  // Process matches in reverse to preserve indices during replacement
  const replacements: Array<{ index: number; length: number; content: string }> = [];

  for (const match of matches) {
    const rawPath = match[1].trim();
    const heading = match[2]?.trim() || null;

    // Resolve path relative to workspace root
    const filePath = rawPath.startsWith('/')
      ? rawPath
      : `${workspaceRoot.replace(/\/+$/, '')}/${rawPath.replace(/^\.\/?/, '')}`;

    const fileContent = await readFile(filePath);
    if (fileContent === null) {
      // File not found — leave the original marker as-is
      continue;
    }

    let content: string;
    if (heading) {
      content = extractHeadingSection(fileContent, heading);
      if (!content) continue; // Heading not found, leave marker
    } else {
      content = fileContent;
    }

    // Recursively resolve transclusions in the included content
    content = await resolveTransclusions(content, readFile, workspaceRoot, maxDepth - 1);

    replacements.push({
      index: match.index,
      length: match[0].length,
      content,
    });
  }

  // Apply replacements in reverse order
  if (replacements.length === 0) return markdown;

  let result = markdown;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    result = result.slice(0, r.index) + r.content + result.slice(r.index + r.length);
  }

  return result;
}

/**
 * Replace `![[...]]` markers with HTML comments for the remark pipeline.
 * This allows the markdown parser to handle the rest of the document without
 * breaking on transclusion syntax. The preview component can then resolve
 * these placeholders after rendering.
 *
 * Returns the transformed markdown and a map of placeholder → original marker.
 */
export function transclusionToPlaceholders(
  markdown: string,
): { markdown: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let counter = 0;
  const transformed = markdown.replace(TRANSCLUSION_RE, (_match) => {
    const id = `TRANSCLUSION_${counter++}`;
    const placeholder = `<!-- ${id} -->`;
    placeholders.set(placeholder, _match);
    return placeholder;
  });
  return { markdown: transformed, placeholders };
}

/**
 * Extract the path and optional heading from a transclusion marker string.
 * E.g. `![[notes.md#Summary]]` → `{ path: 'notes.md', heading: 'Summary' }`
 */
export function parseTransclusionMarker(marker: string): { path: string; heading: string | null } | null {
  const match = marker.match(/^!\[\[([^\]#]+?)(?:#([^\]]+?))?\]\]$/);
  if (!match) return null;
  return { path: match[1].trim(), heading: match[2]?.trim() || null };
}
