import { describe, it, expect } from 'vitest';
import { extractTags } from '../../../../plugins/official/tag-system/src/tag-extractor';

describe('tag-extractor', () => {
  it('extracts plain tags', () => {
    const result = extractTags('hello #world and #test', 'foo.md');
    expect(result).toEqual([
      { tag: 'world', file: 'foo.md', line: 1 },
      { tag: 'test', file: 'foo.md', line: 1 },
    ]);
  });

  it('extracts Chinese tags', () => {
    const result = extractTags('这是一段 #标签 测试 #玄幻小说', 'test.md');
    expect(result).toEqual([
      { tag: '标签', file: 'test.md', line: 1 },
      { tag: '玄幻小说', file: 'test.md', line: 1 },
    ]);
  });

  it('extracts nested tags', () => {
    const result = extractTags('project #project/alpha and #project/beta', 'doc.md');
    expect(result).toEqual([
      { tag: 'project/alpha', file: 'doc.md', line: 1 },
      { tag: 'project/beta', file: 'doc.md', line: 1 },
    ]);
  });

  it('excludes heading # markers', () => {
    const content = '# Title\n## Section\nSome #tag here';
    const result = extractTags(content, 'headings.md');
    expect(result).toEqual([{ tag: 'tag', file: 'headings.md', line: 3 }]);
  });

  it('returns empty for empty content', () => {
    expect(extractTags('', 'empty.md')).toEqual([]);
  });

  it('reports correct line numbers', () => {
    const content = 'line1\nline2 #tag\nline3';
    const result = extractTags(content, 'lines.md');
    expect(result).toEqual([{ tag: 'tag', file: 'lines.md', line: 2 }]);
  });
});
