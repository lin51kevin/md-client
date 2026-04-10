/**
 * F002 — 搜索替换功能
 * 
 * 支持基本文本搜索、正则搜索、大小写敏感选项
 */

export interface SearchResult {
  from: number;
  to: number;
  match: string;
}

/**
 * 在文本中搜索所有匹配项
 */
export function searchAll(
  text: string,
  query: string,
  options?: { caseSensitive?: boolean; regex?: boolean; wholeWord?: boolean },
): SearchResult[] {
  if (!query) return [];

  let regexp: RegExp;
  try {
    regexp = buildRegexp(query, options ?? {});
  } catch {
    return [];
  }

  const results: SearchResult[] = [];
  let match: RegExpExecArray | null;
  
  regexp.lastIndex = 0;
  while ((match = regexp.exec(text)) !== null) {
    if (match[0].length === 0) {
      regexp.lastIndex++;
      continue;
    }
    results.push({
      from: match.index,
      to: match.index + match[0].length,
      match: match[0],
    });
    
    if (results.length > 10000) break;
  }
  
  return results;
}

/** 对正则特殊字符进行转义 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 根据选项构建正则 */
function buildRegexp(
  query: string,
  options: { caseSensitive?: boolean; regex?: boolean; wholeWord?: boolean },
): RegExp {
  const { caseSensitive = false, regex = false, wholeWord = false } = options;
  const flags = caseSensitive ? 'g' : 'gi';
  let pattern = regex ? query : escapeRegex(query);
  if (wholeWord) pattern = `\\b(?:${pattern})\\b`;
  return new RegExp(pattern, flags);
}

/**
 * 执行替换操作（全部替换）
 */
export function replaceAll(
  text: string,
  query: string,
  replacement: string,
  options?: { caseSensitive?: boolean; regex?: boolean; wholeWord?: boolean },
): string {
  if (!query) return text;
  try {
    return text.replace(buildRegexp(query, options ?? {}), replacement);
  } catch {
    return text;
  }
}

/**
 * 执行单次替换（从指定位置开始替换下一个匹配项）
 */
export function replaceNext(
  text: string,
  query: string,
  replacement: string,
  fromPos: number = 0,
  options?: { caseSensitive?: boolean; regex?: boolean; wholeWord?: boolean },
): { newText: string; replacedFrom: number; replacedTo: number } | null {
  const results = searchAll(text, query, options);
  const next = results.find(r => r.from >= fromPos) ?? results[0];
  if (!next) return null;

  const newText = text.slice(0, next.from) + replacement + text.slice(next.to);
  return {
    newText,
    replacedFrom: next.from,
    replacedTo: next.from + replacement.length,
  };
}
