/**
 * Tool Registry - AI Tool definitions for Agent
 * Compatible with OpenAI function calling format
 *
 * DIAG-008 Fix: Added parameter validation with proper error messages
 * - Type checking for all parameter types
 * - Required field validation
 * - Range validation for numbers
 * - String constraints (minLength, maxLength, pattern)
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

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

export interface ToolParameter {
  type: string;
  description?: string;
  default?: unknown;
  // DIAG-008: Extended validation constraints
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
}

export type ToolExecutor = (
  params: Record<string, unknown>,
  docContent: string
) => Promise<{ success: boolean; content: string; error?: string }>;

// ============================================================================
// Parameter Validation (DIAG-008 Fix)
// ============================================================================

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly paramName: string
  ) {
    super(`[${toolName}] 参数验证失败 (${paramName}): ${message}`);
    this.name = 'ValidationError';
  }
}

/**
 * Validate a parameter value against its schema
 * DIAG-008: Comprehensive parameter validation
 */
function validateParam(
  value: unknown,
  schema: ToolParameter,
  paramName: string,
  toolName: string
): void {
  // Type validation
  const actualType = getType(value);
  if (actualType !== schema.type) {
    throw new ValidationError(
      `类型错误: 期望 ${schema.type}, 实际 ${actualType}`,
      toolName,
      paramName
    );
  }

  // String constraints
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      throw new ValidationError(
        `长度不足: 最小 ${schema.minLength}, 实际 ${value.length}`,
        toolName,
        paramName
      );
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      throw new ValidationError(
        `长度超限: 最大 ${schema.maxLength}, 实际 ${value.length}`,
        toolName,
        paramName
      );
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        throw new ValidationError(
          `格式不匹配正则: ${schema.pattern}`,
          toolName,
          paramName
        );
      }
    }
    if (schema.enum && !schema.enum.includes(value)) {
      throw new ValidationError(
        `值不在允许列表中: ${schema.enum.join(', ')}`,
        toolName,
        paramName
      );
    }
  }

  // Number constraints
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      throw new ValidationError(
        `值过小: 最小 ${schema.minimum}, 实际 ${value}`,
        toolName,
        paramName
      );
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      throw new ValidationError(
        `值过大: 最大 ${schema.maximum}, 实际 ${value}`,
        toolName,
        paramName
      );
    }
  }
}

function getType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

/**
 * Validate all parameters for a tool call
 * DIAG-008: Entry point for parameter validation
 */
function validateParams(
  params: Record<string, unknown>,
  toolDef: ToolDef
): void {
  // Check required fields
  for (const required of toolDef.parameters.required) {
    if (!(required in params)) {
      throw new ValidationError(
        '必填参数缺失',
        toolDef.name,
        required
      );
    }
  }

  // Validate each provided parameter
  for (const [key, value] of Object.entries(params)) {
    const schema = toolDef.parameters.properties[key];
    if (!schema) {
      throw new ValidationError(
        `未知参数`,
        toolDef.name,
        key
      );
    }
    validateParam(value, schema, key, toolDef.name);
  }
}

/** Find tool definition by name */
function findToolDef(name: string): ToolDef | undefined {
  return TOOLS.find(t => t.name === name);
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const TOOLS: ToolDef[] = [
  {
    name: 'search',
    description: '在文档中搜索文本，返回所有匹配位置、行号和上下文',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: '要搜索的文本（支持普通字符串）',
          minLength: 1,
          maxLength: 1000,
        },
        context_lines: {
          type: 'number',
          description: '每个匹配周围保留的上下文行数',
          minimum: 0,
          maximum: 10,
          default: 2,
        },
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
        search: {
          type: 'string',
          description: '要查找的文本',
          minLength: 1,
          maxLength: 10000,
        },
        replace: {
          type: 'string',
          description: '替换为的新文本',
          maxLength: 10000,
        },
        occurrence: {
          type: 'number',
          description: '替换第几个匹配（省略则替换全部）',
          minimum: 1,
        },
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
        start: {
          type: 'number',
          description: '起始行号（1-indexed）',
          minimum: 1,
        },
        end: {
          type: 'number',
          description: '结束行号（1-indexed，省略则只取一行）',
          minimum: 1,
        },
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
        start: {
          type: 'number',
          description: '起始行号（1-indexed）',
          minimum: 1,
        },
        end: {
          type: 'number',
          description: '结束行号（1-indexed，省略则只替换一行）',
          minimum: 1,
        },
        new_content: {
          type: 'string',
          description: '新的内容',
          maxLength: 50000,
        },
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
        line: {
          type: 'number',
          description: '目标行号（1-indexed）',
          minimum: 1,
        },
        position: {
          type: 'string',
          description: '"before" 或 "after"',
          enum: ['before', 'after'],
        },
        content: {
          type: 'string',
          description: '要插入的内容',
          maxLength: 50000,
        },
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
        start: {
          type: 'number',
          description: '起始行号（1-indexed）',
          minimum: 1,
        },
        end: {
          type: 'number',
          description: '结束行号（1-indexed，省略则只删除一行）',
          minimum: 1,
        },
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
        pattern: {
          type: 'string',
          description: '正则表达式模式',
          minLength: 1,
          maxLength: 5000,
        },
        replacement: {
          type: 'string',
          description: '替换文本（支持 $1, $2 等捕获组）',
          maxLength: 10000,
        },
        flags: {
          type: 'string',
          description: '标志：g=全局，i=不区分大小写',
          pattern: '^[gimuy]*$',
          default: 'g',
        },
      },
      required: ['pattern', 'replacement'],
    },
  },
];

// ============================================================================
// Tool Executors with Validation (DIAG-008 Fix)
// ============================================================================

/**
 * Wrap executor with parameter validation
 * DIAG-008: All executors now validate params before execution
 */
function createValidatedExecutor(
  toolName: string,
  executor: (params: Record<string, unknown>, docContent: string) => Promise<ToolResult>
): ToolExecutor {
  return async (params, docContent) => {
    try {
      // Find tool definition and validate
      const toolDef = findToolDef(toolName);
      if (toolDef) {
        validateParams(params, toolDef);
      }

      // Execute actual tool
      return await executor(params, docContent);
    } catch (err) {
      if (err instanceof ValidationError) {
        return {
          success: false,
          content: '',
          error: err.message,
        };
      }
      throw err;
    }
  };
}

export interface ToolResult {
  success: boolean;
  content: string;
  edits?: ToolEdit[];
  error?: string;
}

export interface ToolEdit {
  from: number;
  to: number;
  insert: string;
}

export const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  search: createValidatedExecutor('search', async (params, docContent) => {
    const result = await toolSearch(
      docContent,
      params.pattern as string,
      params.context_lines as number
    );
    return {
      success: true,
      content: formatSearchResult(result),
    };
  }),

  replace: createValidatedExecutor('replace', async (params, docContent) => {
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
  }),

  get_lines: createValidatedExecutor('get_lines', async (params, docContent) => {
    const result = await toolGetLines(
      docContent,
      params.start as number,
      params.end as number | undefined
    );
    return {
      success: true,
      content: result,
    };
  }),

  replace_lines: createValidatedExecutor('replace_lines', async (params, docContent) => {
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
  }),

  insert: createValidatedExecutor('insert', async (params, docContent) => {
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
  }),

  delete_lines: createValidatedExecutor('delete_lines', async (params, docContent) => {
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
  }),

  get_outline: createValidatedExecutor('get_outline', async (_params, docContent) => {
    const result = await toolGetOutline(docContent);
    return {
      success: true,
      content: formatOutlineResult(result),
    };
  }),

  regex_replace: createValidatedExecutor('regex_replace', async (params, docContent) => {
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
  }),
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

// ============================================================================
// Re-export types for backward compatibility
// ============================================================================

export type { SearchResult, HeadingInfo };
