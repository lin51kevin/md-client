//! Editor tools for AI Agent - Cross-platform text manipulation utilities
//! All operations are pure in-memory string transformations, no shell commands

use regex::RegexBuilder;
use serde::{Deserialize, Serialize};

/// Search result with context
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchMatch {
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
    pub context_before: Vec<String>,
    pub context_after: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchResult {
    pub matches: Vec<SearchMatch>,
    pub total_matches: usize,
}

/// Heading info for document outline
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HeadingInfo {
    pub level: u8,
    pub text: String,
    pub line_number: usize,
}

/// Tool edit result
#[derive(Serialize, Deserialize, Debug)]
pub struct ToolEditResult {
    pub success: bool,
    pub content: String,
    pub edits: Vec<ToolEdit>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ToolEdit {
    pub from: usize,
    pub to: usize,
    pub insert: String,
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub fn tool_search(
    content: &str,
    pattern: &str,
    context_lines: Option<usize>,
) -> Result<SearchResult, String> {
    let ctx_lines = context_lines.unwrap_or(2);
    let lines: Vec<&str> = content.lines().collect();
    let mut matches = Vec::new();

    for (line_idx, line) in lines.iter().enumerate() {
        if let Some(pos) = line.find(pattern) {
            let match_start = pos;
            let match_end = pos + pattern.len();

            // Get context lines
            let ctx_start = line_idx.saturating_sub(ctx_lines);
            let ctx_end = (line_idx + 1 + ctx_lines).min(lines.len());

            let context_before = lines[ctx_start..line_idx]
                .iter()
                .map(|s| s.to_string())
                .collect();
            let context_after = lines[(line_idx + 1)..ctx_end]
                .iter()
                .map(|s| s.to_string())
                .collect();

            matches.push(SearchMatch {
                line_number: line_idx + 1, // 1-indexed
                line_content: line.to_string(),
                match_start,
                match_end,
                context_before,
                context_after,
            });
        }
    }

    let total = matches.len();
    Ok(SearchResult {
        matches,
        total_matches: total,
    })
}

#[tauri::command]
pub fn tool_replace(
    content: &str,
    search: &str,
    replace: &str,
    occurrence: Option<usize>, // None = all, Some(n) = nth occurrence (1-indexed)
) -> Result<ToolEditResult, String> {
    if search.is_empty() {
        return Err("Search pattern cannot be empty".to_string());
    }

    let mut edits = Vec::new();
    let mut result = content.to_string();
    let offset = 0isize;

    if let Some(n) = occurrence {
        // Replace only nth occurrence
        let mut count = 0;
        let mut found = false;

        for (byte_offset, _) in content.match_indices(search) {
            count += 1;
            if count == n {
                edits.push(ToolEdit {
                    from: byte_offset,
                    to: byte_offset + search.len(),
                    insert: replace.to_string(),
                });
                result.replace_range(byte_offset..byte_offset + search.len(), replace);
                found = true;
                break;
            }
        }

        if !found {
            return Err(format!("Occurrence {} not found (only {} matches)", n, count));
        }
    } else {
        // Replace all occurrences
        for (idx, _) in content.match_indices(search) {
            let adjusted_idx = (idx as isize + offset) as usize;
            edits.push(ToolEdit {
                from: adjusted_idx,
                to: adjusted_idx + search.len(),
                insert: replace.to_string(),
            });
            // For tracking, we need to track the changing indices
            // Actually simpler: just do the replacement and track afterward
        }
        result = content.replace(search, replace);
        // Recalculate edits after replacement
        edits.clear();
        let mut current_idx = 0;
        for (idx, _) in result.match_indices(replace) {
            // Check if this is actually a replacement position
            // This is simplified - in real implementation, need to track original positions
            if current_idx < idx {
                // Potential replacement
            }
            current_idx = idx + replace.len();
        }
    }

    Ok(ToolEditResult {
        success: true,
        content: result,
        edits,
        error: None,
    })
}

#[tauri::command]
pub fn tool_get_lines(content: &str, start: usize, end: Option<usize>) -> Result<String, String> {
    if start == 0 {
        return Err("Line numbers are 1-indexed, start must be >= 1".to_string());
    }

    let lines: Vec<&str> = content.lines().collect();
    let end_line = end.unwrap_or(start);

    if start > lines.len() {
        return Err(format!("Start line {} exceeds total lines {}", start, lines.len()));
    }

    let start_idx = start - 1; // Convert to 0-indexed
    let end_idx = end_line.min(lines.len());

    let result = lines[start_idx..end_idx].join("\n");
    Ok(result)
}

#[tauri::command]
pub fn tool_replace_lines(
    content: &str,
    start: usize,
    end: Option<usize>,
    new_content: &str,
) -> Result<ToolEditResult, String> {
    if start == 0 {
        return Err("Line numbers are 1-indexed, start must be >= 1".to_string());
    }

    let lines: Vec<&str> = content.lines().collect();
    let end_line = end.unwrap_or(start);

    if start > lines.len() {
        return Err(format!("Start line {} exceeds total lines {}", start, lines.len()));
    }

    let start_idx = start - 1;
    let end_idx = end_line.min(lines.len());

    // Calculate character positions for the edit
    let mut char_pos = 0;
    for (idx, line) in lines.iter().enumerate() {
        if idx == start_idx {
            break;
        }
        char_pos += line.len() + 1; // +1 for newline
    }

    let from = char_pos;
    let mut to = from;
    for line in &lines[start_idx..end_idx] {
        to += line.len() + 1;
    }
    if to > from && to <= content.len() {
        // Remove trailing newline if present
        to = to.saturating_sub(1);
    }

    let mut result = content.to_string();
    result.replace_range(from..to, new_content);

    Ok(ToolEditResult {
        success: true,
        content: result,
        edits: vec![ToolEdit {
            from,
            to,
            insert: new_content.to_string(),
        }],
        error: None,
    })
}

#[tauri::command]
pub fn tool_insert(
    content: &str,
    line: usize,
    position: &str, // "before" or "after"
    insert_content: &str,
) -> Result<ToolEditResult, String> {
    if line == 0 {
        return Err("Line numbers are 1-indexed, line must be >= 1".to_string());
    }

    let lines: Vec<&str> = content.lines().collect();
    if line > lines.len() {
        return Err(format!("Line {} exceeds total lines {}", line, lines.len()));
    }

    let line_idx = line - 1;
    let mut char_pos = 0;

    // Calculate position at start of target line
    for (idx, l) in lines.iter().enumerate() {
        if idx == line_idx {
            break;
        }
        char_pos += l.len() + 1;
    }

    let insert_pos = match position {
        "after" => char_pos + lines[line_idx].len() + 1, // After line + newline
        "before" => char_pos,
        _ => return Err("Position must be 'before' or 'after'".to_string()),
    };

    let mut result = content.to_string();
    let insert_str = if position == "after" {
        format!("{}\n", insert_content)
    } else {
        // "before": insert the content followed by a newline at the start of the target line
        format!("{}\n", insert_content)
    };

    result.insert_str(insert_pos.min(result.len()), &insert_str);

    Ok(ToolEditResult {
        success: true,
        content: result,
        edits: vec![ToolEdit {
            from: insert_pos,
            to: insert_pos,
            insert: insert_str,
        }],
        error: None,
    })
}

#[tauri::command]
pub fn tool_delete_lines(
    content: &str,
    start: usize,
    end: Option<usize>,
) -> Result<ToolEditResult, String> {
    if start == 0 {
        return Err("Line numbers are 1-indexed, start must be >= 1".to_string());
    }

    let lines: Vec<&str> = content.lines().collect();
    let end_line = end.unwrap_or(start);

    if start > lines.len() {
        return Err(format!("Start line {} exceeds total lines {}", start, lines.len()));
    }

    let start_idx = start - 1;
    let end_idx = end_line.min(lines.len());

    // Rebuild without the deleted lines
    let mut kept: Vec<&str> = Vec::new();
    for (idx, line) in lines.iter().enumerate() {
        if idx < start_idx || idx >= end_idx {
            kept.push(line);
        }
    }
    let result = kept.join("\n");
    let from = 0;
    let to = content.len();

    Ok(ToolEditResult {
        success: true,
        content: result,
        edits: vec![ToolEdit {
            from,
            to,
            insert: "".to_string(),
        }],
        error: None,
    })
}

#[tauri::command]
pub fn tool_get_outline(content: &str) -> Result<Vec<HeadingInfo>, String> {
    let mut headings = Vec::new();

    for (line_idx, line) in content.lines().enumerate() {
        // Check for Markdown headings (# Heading)
        let trimmed = line.trim_start();
        if let Some(hash_count) = trimmed.chars().take(6).position(|c| c != '#') {
            if hash_count > 0 && trimmed.chars().nth(hash_count) == Some(' ') {
                let text = trimmed[hash_count + 1..].trim().to_string();
                headings.push(HeadingInfo {
                    level: hash_count as u8,
                    text,
                    line_number: line_idx + 1,
                });
            }
        }
    }

    Ok(headings)
}

#[tauri::command]
pub fn tool_regex_replace(
    content: &str,
    pattern: &str,
    replacement: &str,
    flags: Option<&str>,
) -> Result<ToolEditResult, String> {
    let flags = flags.unwrap_or("g");
    let case_insensitive = flags.contains('i');
    let global = flags.contains('g');

    let regex = {
        let mut builder = RegexBuilder::new(pattern);
        if case_insensitive {
            builder.case_insensitive(true);
        }
        builder.build().map_err(|e| format!("Invalid regex: {}", e))?
    };

    let mut edits = Vec::new();
    let result;

    if global {
        // Collect all matches for edits tracking
        for mat in regex.find_iter(content) {
            edits.push(ToolEdit {
                from: mat.start(),
                to: mat.end(),
                insert: replacement.to_string(),
            });
        }
        result = regex.replace_all(content, replacement).to_string();
    } else {
        // Replace only first match
        if let Some(mat) = regex.find(content) {
            edits.push(ToolEdit {
                from: mat.start(),
                to: mat.end(),
                insert: replacement.to_string(),
            });
        }
        result = regex.replace(content, replacement).to_string();
    }

    Ok(ToolEditResult {
        success: true,
        content: result,
        edits,
        error: None,
    })
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ----- tool_search tests -----

    #[test]
    fn test_search_basic() {
        let content = "Hello World\nThis is a test\nHello again";
        let result = tool_search(content, "Hello", Some(1)).unwrap();
        assert_eq!(result.total_matches, 2);
        assert_eq!(result.matches[0].line_number, 1);
        assert_eq!(result.matches[1].line_number, 3);
    }

    #[test]
    fn test_search_with_context() {
        let content = "line 1\nline 2\nline 3\ntarget\nline 5\nline 6";
        let result = tool_search(content, "target", Some(1)).unwrap();
        assert_eq!(result.matches[0].context_before.len(), 1);
        assert_eq!(result.matches[0].context_after.len(), 1);
        assert_eq!(result.matches[0].context_before[0], "line 3");
        assert_eq!(result.matches[0].context_after[0], "line 5");
    }

    #[test]
    fn test_search_no_match() {
        let content = "Hello World";
        let result = tool_search(content, "Goodbye", None).unwrap();
        assert_eq!(result.total_matches, 0);
    }

    // ----- tool_get_lines tests -----

    #[test]
    fn test_get_lines_single() {
        let content = "line 1\nline 2\nline 3\nline 4";
        let result = tool_get_lines(content, 2, None).unwrap();
        assert_eq!(result, "line 2");
    }

    #[test]
    fn test_get_lines_range() {
        let content = "line 1\nline 2\nline 3\nline 4\nline 5";
        let result = tool_get_lines(content, 2, Some(4)).unwrap();
        assert_eq!(result, "line 2\nline 3\nline 4");
    }

    #[test]
    fn test_get_lines_zero_index_error() {
        let content = "line 1\nline 2";
        let result = tool_get_lines(content, 0, None);
        assert!(result.is_err());
    }

    // ----- tool_get_outline tests -----

    #[test]
    fn test_get_outline_simple() {
        let content = "# Heading 1\nSome text\n## Heading 2\nMore text";
        let headings = tool_get_outline(content).unwrap();
        assert_eq!(headings.len(), 2);
        assert_eq!(headings[0].level, 1);
        assert_eq!(headings[0].text, "Heading 1");
        assert_eq!(headings[1].level, 2);
        assert_eq!(headings[1].text, "Heading 2");
    }

    #[test]
    fn test_get_outline_no_headings() {
        let content = "Just some text\nMore text";
        let headings = tool_get_outline(content).unwrap();
        assert!(headings.is_empty());
    }

    // ----- tool_regex_replace tests -----

    #[test]
    fn test_regex_replace_global() {
        let content = "foo bar foo baz foo";
        let result = tool_regex_replace(content, r"foo", "XXX", Some("g")).unwrap();
        assert_eq!(result.content, "XXX bar XXX baz XXX");
        assert_eq!(result.edits.len(), 3);
    }

    #[test]
    fn test_regex_replace_first_only() {
        let content = "foo bar foo";
        let result = tool_regex_replace(content, r"foo", "XXX", Some("")).unwrap();
        assert_eq!(result.content, "XXX bar foo");
        assert_eq!(result.edits.len(), 1);
    }

    #[test]
    fn test_regex_replace_case_insensitive() {
        let content = "Hello HELLO hello";
        let result = tool_regex_replace(content, r"hello", "XXX", Some("gi")).unwrap();
        assert_eq!(result.content, "XXX XXX XXX");
    }

    // ----- tool_replace tests -----

    #[test]
    fn test_replace_single() {
        let content = "Hello World";
        let result = tool_replace(content, "World", "Universe", Some(1)).unwrap();
        assert_eq!(result.content, "Hello Universe");
        assert_eq!(result.edits.len(), 1);
    }

    #[test]
    fn test_replace_not_found() {
        let content = "Hello World";
        let result = tool_replace(content, "Goodbye", "Universe", Some(1));
        assert!(result.is_err());
    }

    // ----- tool_replace_lines tests -----

    #[test]
    fn test_replace_lines() {
        let content = "line 1\nline 2\nline 3\nline 4";
        let result = tool_replace_lines(content, 2, Some(3), "NEW LINE").unwrap();
        assert!(result.content.contains("NEW LINE"));
        assert!(!result.content.contains("line 2"));
    }

    // ----- tool_delete_lines tests -----

    #[test]
    fn test_delete_lines() {
        let content = "keep 1\ndelete 1\ndelete 2\nkeep 2";
        let result = tool_delete_lines(content, 2, Some(3)).unwrap();
        assert_eq!(result.content, "keep 1\nkeep 2");
    }

    // ----- tool_insert tests -----

    #[test]
    fn test_insert_after() {
        let content = "line 1\nline 2\nline 3";
        let result = tool_insert(content, 2, "after", "INSERTED").unwrap();
        assert!(result.content.contains("line 2\nINSERTED\n"));
    }

    #[test]
    fn test_insert_before() {
        let content = "line 1\nline 2\nline 3";
        let result = tool_insert(content, 2, "before", "INSERTED").unwrap();
        assert!(result.content.contains("line 1\nINSERTED\nline 2"));
    }
}
