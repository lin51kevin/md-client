import { describe, it, expect } from 'vitest';
import { tocToMindmap } from '../../lib/mindmap-converter';
import type { TocEntry } from '../../lib/toc';

function makeToc(entries: { level: number; text: string }[]): TocEntry[] {
  let pos = 0;
  return entries.map((e, i) => {
    const entry: TocEntry = { level: e.level, text: e.text, position: pos, id: `heading-${i}` };
    pos += 20;
    return entry;
  });
}

describe('tocToMindmap', () => {
  it('空 TOC 返回包含根节点的 mindmap 语法', () => {
    const result = tocToMindmap([]);
    expect(result).toContain('mindmap');
    expect(result).toContain('root');
  });

  it('单个 h1 标题生成根节点 + 一个子节点', () => {
    const toc = makeToc([{ level: 1, text: '引言' }]);
    const result = tocToMindmap(toc);
    expect(result).toContain('mindmap');
    expect(result).toContain('引言');
  });

  it('多个同级标题生成平行子节点', () => {
    const toc = makeToc([
      { level: 1, text: '第一章' },
      { level: 1, text: '第二章' },
      { level: 1, text: '第三章' },
    ]);
    const result = tocToMindmap(toc);
    expect(result).toContain('第一章');
    expect(result).toContain('第二章');
    expect(result).toContain('第三章');
  });

  it('嵌套标题使用正确的缩进层级', () => {
    const toc = makeToc([
      { level: 1, text: '第一章' },
      { level: 2, text: '第一节' },
      { level: 3, text: '详细内容' },
    ]);
    const result = tocToMindmap(toc);
    const lines = result.split('\n').map(l => l.trimEnd());
    const h1Line = lines.find(l => l.includes('第一章'))!;
    const h2Line = lines.find(l => l.includes('第一节'))!;
    const h3Line = lines.find(l => l.includes('详细内容'))!;
    const indent = (s: string) => s.length - s.trimStart().length;
    expect(indent(h2Line)).toBeGreaterThan(indent(h1Line));
    expect(indent(h3Line)).toBeGreaterThan(indent(h2Line));
  });

  it('混合层级（h1→h3 跳级）也能正确生成', () => {
    const toc = makeToc([
      { level: 1, text: 'Top' },
      { level: 3, text: 'Deep' },
    ]);
    const result = tocToMindmap(toc);
    expect(result).toContain('Top');
    expect(result).toContain('Deep');
    const lines = result.split('\n');
    const topLine = lines.find(l => l.includes('Top'))!;
    const deepLine = lines.find(l => l.includes('Deep'))!;
    const indent = (s: string) => s.length - s.trimStart().length;
    expect(indent(deepLine)).toBeGreaterThan(indent(topLine));
  });

  it('标题中的特殊字符需要被转义或处理', () => {
    const toc = makeToc([
      { level: 1, text: 'Hello (World)' },
      { level: 2, text: 'Test & "Quotes"' },
    ]);
    const result = tocToMindmap(toc);
    expect(result).toContain('mindmap');
    // Should not contain raw parentheses that break Mermaid syntax
    expect(result).not.toMatch(/Hello \(World\)/);
  });

  it('可接受自定义根节点文本', () => {
    const toc = makeToc([{ level: 1, text: '章节' }]);
    const result = tocToMindmap(toc, '我的文档');
    expect(result).toContain('我的文档');
  });

  it('50 个节点的 TOC 能正常转换', () => {
    const entries: { level: number; text: string }[] = [];
    for (let i = 0; i < 50; i++) {
      entries.push({ level: (i % 3) + 1, text: `标题 ${i + 1}` });
    }
    const toc = makeToc(entries);
    const result = tocToMindmap(toc);
    expect(result).toContain('mindmap');
    expect(result).toContain('标题 1');
    expect(result).toContain('标题 50');
  });

  it('仅 h2 和 h3 的 TOC（无 h1）也能正常工作', () => {
    const toc = makeToc([
      { level: 2, text: '小节 A' },
      { level: 3, text: '段落 1' },
      { level: 2, text: '小节 B' },
    ]);
    const result = tocToMindmap(toc);
    expect(result).toContain('小节 A');
    expect(result).toContain('段落 1');
    expect(result).toContain('小节 B');
  });
});
