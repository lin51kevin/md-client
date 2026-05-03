import type { CompletionResult, CompletionContext } from '@codemirror/autocomplete';

/**
 * File path autocompleter.
 *
 * Triggers when the cursor is after a relative path prefix (`./` or `../`).
 * Matches files from the workspace and returns them as completion options.
 */
export function createFilePathCompleter(
  getAllFiles: () => string[],
): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext): CompletionResult | null => {
    const { pos, state } = context;
    const line = state.doc.lineAt(pos);
    const textBefore = line.text.slice(0, pos - line.from);

    // Match a relative path prefix: ./ or ../ optionally followed by path chars
    const match = textBefore.match(/(\.\.?\/[\w./_-]*)$/);
    if (!match) return null;

    const prefix = match[1];
    const from = pos - prefix.length;

    // Resolve the directory part of the prefix
    const lastSlash = prefix.lastIndexOf('/');
    const dirPrefix = prefix.slice(0, lastSlash + 1); // e.g. "./src/" or "../"
    const filterText = prefix.slice(lastSlash + 1);   // text after last /

    // Normalize the directory prefix to figure out what directory we're in
    // Simple approach: collect unique directory names from workspace files
    const allFiles = getAllFiles();
    const normalizedPrefix = dirPrefix === './' ? '' : dirPrefix;
    const seen = new Set<string>();
    const options: Array<{ label: string; type: string; detail: string }> = [];

    for (const filePath of allFiles) {
      let candidate = filePath;
      // If we have a directory prefix, filter files under that directory
      if (normalizedPrefix) {
        if (!candidate.startsWith(normalizedPrefix)) continue;
        candidate = candidate.slice(normalizedPrefix.length);
      }

      // Take only the first path segment (for directory browsing)
      const firstSegment = candidate.split('/')[0];
      if (!firstSegment) continue;
      if (seen.has(firstSegment)) continue;
      seen.add(firstSegment);

      if (filterText && !firstSegment.startsWith(filterText)) continue;

      const isDir = allFiles.some((f) => {
        const rel = normalizedPrefix ? f.slice(normalizedPrefix.length) : f;
        return rel.startsWith(firstSegment + '/');
      });

      options.push({
        label: firstSegment + (isDir ? '/' : ''),
        type: isDir ? 'file' : 'text',
        detail: isDir ? '文件夹' : '文件',
      });
    }

    if (options.length === 0) return null;

    return {
      from,
      options,
    };
  };
}
