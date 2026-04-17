/** Tool bridge - Tauri IPC wrapper for editor tools
 * Cross-platform: delegates to Rust backend commands
 */

import { invoke } from '@tauri-apps/api/core';

export interface ToolCallRequest {
  tool: string;
  params: Record<string, unknown>;
}

export interface SearchMatch {
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
  context_before: string[];
  context_after: string[];
}

export interface SearchResult {
  matches: SearchMatch[];
  total_matches: number;
}

export interface HeadingInfo {
  level: number;
  text: string;
  line_number: number;
}

export interface ToolEdit {
  from: number;
  to: number;
  insert: string;
}

export interface ToolResult {
  success: boolean;
  content: string;
  edits?: ToolEdit[];
  error?: string;
}

export async function toolSearch(
  content: string,
  pattern: string,
  contextLines?: number
): Promise<SearchResult> {
  return invoke<SearchResult>('tool_search', {
    content,
    pattern,
    context_lines: contextLines ?? 2,
  });
}

export async function toolReplace(
  content: string,
  search: string,
  replace: string,
  occurrence?: number
): Promise<ToolResult> {
  return invoke<ToolResult>('tool_replace', {
    content,
    search,
    replace,
    occurrence: occurrence ?? null,
  });
}

export async function toolGetLines(
  content: string,
  start: number,
  end?: number
): Promise<string> {
  return invoke<string>('tool_get_lines', { content, start, end: end ?? null });
}

export async function toolReplaceLines(
  content: string,
  start: number,
  newContent: string,
  end?: number
): Promise<ToolResult> {
  return invoke<ToolResult>('tool_replace_lines', {
    content,
    start,
    end: end ?? null,
    new_content: newContent,
  });
}

export async function toolInsert(
  content: string,
  line: number,
  position: 'before' | 'after',
  insertContent: string
): Promise<ToolResult> {
  return invoke<ToolResult>('tool_insert', {
    content,
    line,
    position,
    insert_content: insertContent,
  });
}

export async function toolDeleteLines(
  content: string,
  start: number,
  end?: number
): Promise<ToolResult> {
  return invoke<ToolResult>('tool_delete_lines', {
    content,
    start,
    end: end ?? null,
  });
}

export async function toolGetOutline(content: string): Promise<HeadingInfo[]> {
  return invoke<HeadingInfo[]>('tool_get_outline', { content });
}

export async function toolRegexReplace(
  content: string,
  pattern: string,
  replacement: string,
  flags?: string
): Promise<ToolResult> {
  return invoke<ToolResult>('tool_regex_replace', {
    content,
    pattern,
    replacement,
    flags: flags ?? 'g',
  });
}
