/**
 * F010 — 大纲导航侧边栏
 *
 * 从 Markdown 文本中提取标题层级结构（h1-h6），
 * 生成扁平化的目录树，支持点击跳转。
 */

/** 大纲条目 */
export interface TocEntry {
  /** 标题级别 1-6 */
  level: number;
  /** 标题文本（去除 # 前缀和尾部 #） */
  text: string;
  /** 在原文中的起始位置（用于跳转/高亮） */
  position: number;
  /** 唯一 id (slug) */
  id: string;
}

/**
 * 从 Markdown 文本中提取所有标题
 *
 * 支持 ATX 风格：# Heading ## Heading
 * 支持 Setext 风格（暂不实现，ATX 已覆盖绝大多数场景）
 */
export function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = matchHeading(line);
    if (match) {
      // 计算在原文中的字符位置
      const position = lines.slice(0, i).reduce((sum, l) => sum + l.length + 1, 0);
      entries.push({
        level: match.level,
        text: match.text,
        position,
        id: slugify(match.text),
      });
    }
  }

  return entries;
}

/**
 * 匹配单行是否为 ATX 标题
 */
function matchHeading(line: string): { level: number; text: string } | null {
  // ATX heading: 1-6 个 # 后跟空格
  const atxMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
  if (atxMatch) {
    return {
      level: atxMatch[1].length,
      text: atxMatch[2].trim(),
    };
  }
  return null;
}

/**
 * 将文本转为 URL-safe slug（用于锚点）
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
