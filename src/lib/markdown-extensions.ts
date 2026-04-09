/**
 * F014 — Markdown 扩展支持：脚注 + frontmatter
 *
 * 提供：
 * - extractFootnotes: 从 Markdown 文本提取脚注定义
 * - buildFootnoteHtml: 生成脚注 HTML 列表
 * - extractFrontmatter: 从 Markdown 文本提取 YAML frontmatter
 * - buildFrontmatterHtml: 将 frontmatter 渲染为 HTML 预览块
 */

/** 脚注定义 */
export interface FootnoteDef {
  id: string;
  def: string;
}

/** Frontmatter 解析结果 */
export interface Frontmatter {
  title?: string;
  author?: string;
  date?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * 从 Markdown 文本中提取所有脚注定义
 *
 * 支持格式：
 * [^id]: 脚注内容
 * [^id]: 脚注内容
 *   续行（以空白字符开头）
 */
export function extractFootnotes(md: string): FootnoteDef[] {
  const footnotes: FootnoteDef[] = [];

  // 找所有脚注定义块（简化实现：每行 [^id]: 开头，非缩进行结束）
  const lines = md.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)/);
    if (match) {
      const id = match[1].trim();
      let def = match[2].trim();
      // 合并后续缩进行
      i++;
      while (i < lines.length && /^[ \t]/.test(lines[i])) {
        def += '\n' + lines[i].trim();
        i++;
      }
      footnotes.push({ id, def });
      continue;
    }
    i++;
  }

  return footnotes;
}

/**
 * 将脚注列表渲染为 HTML 列表
 */
export function buildFootnoteHtml(footnotes: FootnoteDef[]): string {
  if (footnotes.length === 0) return '';

  const items = footnotes
    .map((fn, idx) => {
      const num = idx + 1;
      return (
        `<li id="fn-${fn.id}" class="footnote-item">` +
        `<a href="#fnref-${fn.id}" class="footnote-back" aria-label="Back to reference">${num}</a>` +
        `<span>${escapeHtml(fn.def)}</span>` +
        `</li>`
      );
    })
    .join('\n');

  return (
    `<section class="footnotes" aria-label="Footnotes">` +
    `<hr/><ol class="footnote-list">\n${items}\n</ol>` +
    `</section>`
  );
}

/**
 * 从 Markdown 文本中提取 YAML frontmatter
 *
 * 支持格式：
 * ---
 * title: xxx
 * author: xxx
 * tags:
 *   - tech
 *   - writing
 * ---
 */
export function extractFrontmatter(md: string): Frontmatter {
  if (!md.startsWith('---')) return {};

  const endIdx = md.indexOf('\n---', 3);
  if (endIdx === -1) return {};

  const yaml = md.substring(4, endIdx).trim();
  if (!yaml) return {};

  const result: Frontmatter = {};
  const lines = yaml.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) { i++; continue; }

    const key = line.substring(0, colonIdx).trim();
    const valuePart = line.substring(colonIdx + 1).trim();

    if (valuePart === '') {
      // 空值：检查后续行是否为 YAML 列表（以 - 开头）
      const items: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trimStart();
        const arrMatch = nextLine.match(/^-\s*(.+)/);
        if (arrMatch) {
          items.push(arrMatch[1].trim());
          j++;
        } else {
          break;
        }
      }
      if (items.length > 0) {
        result[key] = items;
        i = j;
        continue;
      }
    }

    // 去除引号
    let value = valuePart;
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (value) result[key] = value;
    i++;
  }

  return result;
}

/**
 * 将 frontmatter 渲染为 HTML 预览块
 */
export function buildFrontmatterHtml(fm: Frontmatter): string {
  const keys = Object.keys(fm);
  if (keys.length === 0) return '';

  const rows = keys
    .map((key) => {
      const val = fm[key];
      const displayVal = Array.isArray(val) ? (val as string[]).join(', ') : String(val);
      return (
        `<tr><th class="fm-key">${escapeHtml(key)}</th>` +
        `<td class="fm-val">${escapeHtml(displayVal)}</td></tr>`
      );
    })
    .join('\n');

  return (
    `<div class="frontmatter-block" aria-label="Document metadata">` +
    `<table class="fm-table">\n${rows}\n</table>` +
    `</div>`
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
