/** Tool Registry - AI Tool definitions for Agent
 * Compatible with OpenAI function calling format
 */

import {
  toolSearch,
  toolReplace,
  toolGetLines,
  toolReplaceLines,
  toolInsert,
  toolDeleteLines,
  toolGetOutline,
  toolRegexReplace,
  type SearchResult,
  type HeadingInfo,
} from './tauri-bridge';

export interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      default?: unknown;
    }>;
    required: string[];
  };
}

export type ToolExecutor = (
  params: Record<string, unknown>,
  docContent: string
) => Promise<{ success: boolean; content: string; error?: string }>;

export const TOOLS: ToolDef[] = [
  {
    name: 'search',
    description: '在文档中搜索文本，返回所有匹配位置、行号和上下文',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: '要搜索的文本（支持普通字符串）' },
        context_lines: { type: 'number', description: '每个匹配周围保留的上下文行数', default: 2 },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'replace',
    description: '替换文档中的文本内容',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: '要查找的文本' },
        replace: { type: 'string', description: '替换为的新文本' },
        occurrence: { type: 'number', description: '替换第几个匹配（省略则替换全部）' },
      },
      required: ['search', 'replace'],
    },
  },
  {
    name: 'get_lines',
    description: '获取文档指定行号范围的内容',
    parameters: {
      type: 'object',
      properties: {
        start: { type: 'number', description: '起始行号（1-indexed）' },
        end: { type: 'number', description: '结束行号（1-indexed，省略则只取一行）' },
      },
      required: ['start'],
    },
  },
  {
    name: 'replace_lines',
    description: '替换文档指定行号范围的内容',
    parameters: {
      type: 'object',
      properties: {
        start: { type: 'number', description: '起始行号（1-indexed）' },
        end: { type: 'number', description: '结束行号（1-indexed，省略则只替换一行）' },
        new_content: { type: 'string', description: '新的内容' },
      },
      required: ['start', 'new_content'],
    },
  },
  {
    name: 'insert',
    description: '在指定行号前或后插入内容',
    parameters: {
      type: 'object',
      properties: {
        line: { type: 'number', description: '目标行号（1-indexed）' },
        position: { type: 'string', description: '"before" 或 "after"' },
        content: { type: 'string', description: '要插入的内容' },
      },
      required: ['line', 'position', 'content'],
    },
  },
  {
    name: 'delete_lines',
    description: '删除指定行号范围的内容',
    parameters: {
      type: 'object',
      properties: {
        start: { type: 'number', description: '起始行号（1-indexed）' },
        end: { type: 'number', description: '结束行号（1-indexed，省略则只删除一行）' },
      },
      required: ['start'],
    },
  },
  {
    name: 'get_outline',
    description: '获取文档大纲（所有 Markdown 标题及层级）',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'regex_replace',
    description: '使用正则表达式替换文本',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: '正则表达式模式' },
        replacement: { type: 'string', description: '替换文本（支持 $1, $2 等捕获组）' },
        flags: { type: 'string', description: '标志：g=全局，i=不区分大小写', default: 'g' },
      },
      required: ['pattern', 'replacement'],
    },
  },
];

export const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  async search(params, docContent) {
    const result = await toolSearch(
      docContent,
      params.pattern as string,
      params.context_lines as number
    );
    return {
      success: true,
      content: formatSearchResult(result),
    };
  },

  async replace(params, docContent) {
    const result = await toolReplace(
      docContent,
      params.search as string,
      params.replace as string,
      params.occurrence as number | undefined
    );
    return {
      success: result.success,
      content: result.content,
      error: result.error,
    };
  },

  async get_lines(params, docContent) {
    const result = await toolGetLines(
      docContent,
      params.start as number,
      params.end as number | undefined
    );
    return {
      success: true,
      content: result,
    };
  },

  async replace_lines(params, docContent) {
    const result = await toolReplaceLines(
      docContent,
      params.start as number,
      params.new_content as string,
      params.end as number | undefined
    );
    return {
      success: result.success,
      content: result.content,
      error: result.error,
    };
  },

  async insert(params, docContent) {
    const result = await toolInsert(
      docContent,
      params.line as number,
      params.position as 'before' | 'after',
      params.content as string
    );
    return {
      success: result.success,
      content: result.content,
      error: result.error,
    };
  },

  async delete_lines(params, docContent) {
    const result = await toolDeleteLines(
      docContent,
      params.start as number,
      params.end as number | undefined
    );
    return {
      success: result.success,
      content: result.content,
      error: result.error,
    };
  },

  async get_outline(_params, docContent) {
    const result = await toolGetOutline(docContent);
    return {
      success: true,
      content: formatOutlineResult(result),
    };
  },

  async regex_replace(params, docContent) {
    const result = await toolRegexReplace(
      docContent,
      params.pattern as string,
      params.replacement as string,
      params.flags as string | undefined
    );
    return {
      success: result.success,
      content: result.content,
      error: result.error,
    };
  },
};

function formatSearchResult(result: SearchResult): string {
  if (result.total_matches === 0) {
    return '未找到匹配';
  }
  const lines = [`找到 ${result.total_matches} 个匹配:`];
  for (const m of result.matches) {
    lines.push(`  第 ${m.line_number} 行: ${m.line_content.slice(0, 50)}...`);
  }
  return lines.join('\n');
}

function formatOutlineResult(headings: HeadingInfo[]): string {
  if (headings.length === 0) {
    return '文档没有标题';
  }
  return headings
    .map((h) => `${'  '.repeat(h.level - 1)}${'#'.repeat(h.level)} ${h.text}`)
    .join('\n');
}
