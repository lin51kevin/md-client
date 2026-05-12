//! Core search/replace logic and Tauri commands.

use super::types::{ReplaceInFilesResult, SearchResult};
use crate::read_text_auto_encoding;
use crate::validate_user_path;

/// Build a compiled regex for the search options, or return `None` when a
/// plain string scan is sufficient (no regex, no whole-word).
pub(crate) fn build_search_regex(
    query: &str,
    case_sensitive: bool,
    use_regex: bool,
    whole_word: bool,
) -> Result<Option<regex::Regex>, String> {
    if !use_regex && !whole_word {
        return Ok(None);
    }

    let source = if use_regex {
        query.to_string()
    } else {
        regex::escape(query)
    };

    let pattern = if whole_word {
        format!(r"\b(?:{})\b", source)
    } else {
        source
    };

    regex::RegexBuilder::new(&pattern)
        .case_insensitive(!case_sensitive)
        .build()
        .map(Some)
        .map_err(|e| format!("正则表达式错误: {}", e))
}

/// Return `true` when `path` has a supported text-file extension.
pub(crate) fn is_text_file(path: &std::path::Path) -> bool {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        matches!(ext.to_lowercase().as_str(), "md" | "markdown" | "txt")
    } else if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
        matches!(name.to_lowercase().as_str(), "dockerfile" | "makefile")
    } else {
        false
    }
}

/// Recursively collect all supported text files under `dir`, skipping hidden
/// entries (names starting with `.`).
pub(crate) fn collect_files(dir: &std::path::Path) -> Vec<std::path::PathBuf> {
    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.starts_with('.'))
                .unwrap_or(false)
            {
                continue;
            }
            if p.is_dir() {
                files.extend(collect_files(&p));
            } else if p.is_file() && is_text_file(&p) {
                files.push(p);
            }
        }
    }
    files
}

/// Maximum number of search results returned in a single query.
pub(crate) const MAX_RESULTS: usize = 200;

/// Core search logic — runs on a blocking thread.
pub(crate) fn search_files_impl(
    directory: &str,
    query: &str,
    case_sensitive: bool,
    use_regex: bool,
    whole_word: bool,
) -> Result<Vec<SearchResult>, String> {
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let dir_path = std::path::Path::new(directory);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(format!("目录不存在或不是目录: {}", directory));
    }

    let files = collect_files(dir_path);
    let regex = build_search_regex(query, case_sensitive, use_regex, whole_word)?;
    let pattern = if case_sensitive { query.to_string() } else { query.to_lowercase() };

    let mut results: Vec<SearchResult> = Vec::new();

    'outer: for filepath in files {
        if results.len() >= MAX_RESULTS {
            break;
        }

        let content = match read_text_auto_encoding(&filepath.to_string_lossy()) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let fname = filepath
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("?")
            .to_string();
        let fpath = filepath.to_string_lossy().to_string();
        let all_lines: Vec<&str> = content.lines().collect();

        for line_idx in 0..all_lines.len() {
            if results.len() >= MAX_RESULTS {
                break 'outer;
            }

            let line = all_lines[line_idx];

            let found = if let Some(ref r) = regex {
                r.find(line).is_some()
            } else if case_sensitive {
                line.contains(pattern.as_str())
            } else {
                line.to_lowercase().contains(&pattern)
            };

            if !found {
                continue;
            }

            let (ms, me) = if let Some(ref r) = regex {
                r.find(line).map(|m| {
                    let cs = line[..m.start()].encode_utf16().count();
                    let ce = cs + line[m.start()..m.end()].encode_utf16().count();
                    (cs, ce)
                }).unwrap_or((0, 0))
            } else if case_sensitive {
                let byte_pos = line.find(pattern.as_str()).unwrap_or(0);
                let cs = line[..byte_pos].encode_utf16().count();
                (cs, cs + pattern.encode_utf16().count())
            } else {
                let lower = line.to_lowercase();
                let byte_pos = lower.find(&pattern).unwrap_or(0);
                let cs = lower[..byte_pos].encode_utf16().count();
                (cs, cs + pattern.encode_utf16().count())
            };

            results.push(SearchResult {
                file_path: fpath.clone(),
                file_name: fname.clone(),
                line_number: (line_idx + 1) as u32,
                line_content: line.to_string(),
                match_start: ms,
                match_end: me,
                context_before: if line_idx > 0 {
                    Some(all_lines[line_idx - 1].to_string())
                } else {
                    None
                },
                context_after: if line_idx + 1 < all_lines.len() {
                    Some(all_lines[line_idx + 1].to_string())
                } else {
                    None
                },
            });
        }
    }

    Ok(results)
}

/// Core replace logic — runs on a blocking thread.
pub(crate) fn replace_in_files_impl(
    directory: &str,
    query: &str,
    replacement: &str,
    case_sensitive: bool,
    use_regex: bool,
    whole_word: bool,
) -> Result<ReplaceInFilesResult, String> {
    if query.is_empty() {
        return Ok(ReplaceInFilesResult { replaced_count: 0, files_modified: vec![] });
    }

    let dir_path = std::path::Path::new(directory);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(format!("目录不存在或不是目录: {}", directory));
    }

    let re = build_search_regex(query, case_sensitive, use_regex, whole_word)?;
    let pattern_lower = query.to_lowercase();
    let mut replaced_count = 0u32;
    let mut files_modified = Vec::new();

    for filepath in collect_files(dir_path) {
        let filepath_str = filepath.to_string_lossy().to_string();
        let content = match read_text_auto_encoding(&filepath_str) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let (new_content, count) = if let Some(ref r) = re {
            let count = r.find_iter(&content).count() as u32;
            if count == 0 { continue; }
            (r.replace_all(&content, replacement).to_string(), count)
        } else {
            let needle = if case_sensitive { query } else { &pattern_lower };
            let haystack = if case_sensitive { content.clone() } else { content.to_lowercase() };
            let count = haystack.matches(needle).count() as u32;
            if count == 0 { continue; }

            let new = if case_sensitive {
                content.replace(needle, replacement)
            } else {
                let lower = content.to_lowercase();
                let needle = &pattern_lower;
                let mut result = String::with_capacity(content.len());
                let orig_chars: Vec<(usize, char)> = content.char_indices().collect();
                let lower_chars: Vec<(usize, char)> = lower.char_indices().collect();
                let char_count = orig_chars.len();

                let mut char_idx = 0usize;
                let mut lower_start = 0usize;
                let mut orig_start = 0usize;

                loop {
                    if let Some(match_pos) = lower[lower_start..].find(needle.as_str()) {
                        let lower_match = lower_start + match_pos;
                        let lower_match_end = lower_match + needle.len();

                        while char_idx < char_count && lower_chars[char_idx].0 < lower_match {
                            char_idx += 1;
                        }
                        let orig_match = orig_chars[char_idx].0;

                        let mut end_char_idx = char_idx;
                        while end_char_idx < char_count && lower_chars[end_char_idx].0 < lower_match_end {
                            end_char_idx += 1;
                        }
                        let orig_match_end = if end_char_idx < char_count {
                            orig_chars[end_char_idx].0
                        } else {
                            content.len()
                        };

                        result.push_str(&content[orig_start..orig_match]);
                        result.push_str(replacement);
                        orig_start = orig_match_end;
                        lower_start = lower_match_end;
                    } else {
                        break;
                    }
                }
                result.push_str(&content[orig_start..]);
                result
            };
            (new, count)
        };

        std::fs::write(&filepath, new_content.as_bytes())
            .map_err(|e| format!("写入文件失败 {}: {}", filepath.display(), e))?;
        replaced_count += count;
        files_modified.push(filepath_str);
    }

    Ok(ReplaceInFilesResult { replaced_count, files_modified })
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// Search for text across all .md/.markdown/.txt files in a directory (recursive).
#[tauri::command]
pub async fn search_files(
    directory: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
    whole_word: bool,
) -> Result<Vec<SearchResult>, String> {
    validate_user_path(&directory)?;
    let directory = directory.clone();
    let query = query.clone();
    tauri::async_runtime::spawn_blocking(move || {
        search_files_impl(&directory, &query, case_sensitive, use_regex, whole_word)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Replace text across all .md/.markdown/.txt files in a directory (recursive).
#[tauri::command]
pub async fn replace_in_files(
    directory: String,
    query: String,
    replacement: String,
    case_sensitive: bool,
    use_regex: bool,
    whole_word: bool,
) -> Result<ReplaceInFilesResult, String> {
    validate_user_path(&directory)?;
    let directory = directory.clone();
    let query = query.clone();
    let replacement = replacement.clone();
    tauri::async_runtime::spawn_blocking(move || {
        replace_in_files_impl(&directory, &query, &replacement, case_sensitive, use_regex, whole_word)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn tmp(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("marklite-test-{}", name))
    }

    // ── build_search_regex ────────────────────────────────────────────────────

    #[test]
    fn test_plain_string_no_regex() {
        let r = build_search_regex("hello", false, false, false).unwrap();
        assert!(r.is_none());
    }

    #[test]
    fn test_regex_mode() {
        let r = build_search_regex("hello", true, true, false).unwrap();
        assert!(r.is_some());
        let re = r.unwrap();
        assert!(re.is_match("hello world"));
        assert!(!re.is_match("world"));
    }

    #[test]
    fn test_whole_word() {
        let r = build_search_regex("foo", true, false, true).unwrap();
        assert!(r.is_some());
        let re = r.unwrap();
        assert!(re.is_match("foo bar"));
        assert!(!re.is_match("foobar"));
    }

    #[test]
    fn test_invalid_regex() {
        // Test with an actually invalid regex pattern (unclosed bracket)
        let r = build_search_regex("fo[", true, true, false);
        assert!(r.is_err());
    }

    #[test]
    fn test_case_insensitive() {
        let r = build_search_regex("Hello", false, true, false).unwrap().unwrap();
        assert!(r.is_match("hello"));
        assert!(r.is_match("HELLO"));
        assert!(r.is_match("Hello"));
    }

    // ── is_text_file ─────────────────────────────────────────────────────────

    #[test]
    fn test_text_file_extensions() {
        assert!(is_text_file(std::path::Path::new("test.md")));
        assert!(is_text_file(std::path::Path::new("test.markdown")));
        assert!(is_text_file(std::path::Path::new("test.txt")));
        assert!(!is_text_file(std::path::Path::new("test.rs")));
        assert!(!is_text_file(std::path::Path::new("test.png")));
    }

    #[test]
    fn test_text_file_special_names() {
        assert!(is_text_file(std::path::Path::new("Dockerfile")));
        assert!(is_text_file(std::path::Path::new("Makefile")));
        assert!(!is_text_file(std::path::Path::new("random.sh")));
    }

    // ── collect_files ─────────────────────────────────────────────────────────

    #[test]
    fn test_collect_files_basic() {
        let dir = tmp("collect_basic");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let f1 = dir.join("readme.md");
        let f2 = dir.join("notes.txt");
        std::fs::write(&f1, "hello").unwrap();
        std::fs::write(&f2, "world").unwrap();

        let files = collect_files(&dir);
        assert_eq!(files.len(), 2);
        let names: Vec<String> = files.iter().map(|p| p.file_name().unwrap().to_string_lossy().to_string()).collect();
        assert!(names.contains(&"readme.md".to_string()));
        assert!(names.contains(&"notes.txt".to_string()));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_collect_files_skips_hidden() {
        let dir = tmp("collect_hidden");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        std::fs::write(dir.join("visible.md"), "").unwrap();
        std::fs::create_dir_all(dir.join(".hidden")).unwrap();
        std::fs::write(dir.join(".hidden").join("secret.md"), "").unwrap();

        let files = collect_files(&dir);
        assert_eq!(files.len(), 1);
        assert!(files[0].file_name().unwrap().to_str().unwrap().eq("visible.md"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_collect_files_recursive() {
        let dir = tmp("collect_recursive");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("sub")).unwrap();

        std::fs::write(dir.join("a.md"), "top").unwrap();
        std::fs::write(dir.join("sub").join("b.md"), "nested").unwrap();

        let files = collect_files(&dir);
        assert_eq!(files.len(), 2);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_collect_files_nonexistent() {
        let files = collect_files(std::path::Path::new("/nonexistent/path/that/should/not/exist"));
        assert_eq!(files.len(), 0);
    }

    // ── search_files_impl ─────────────────────────────────────────────────────

    #[test]
    fn test_search_basic() {
        let dir = tmp("search_basic");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let p = dir.join("test.md");
        let content = "line one\nhello world\nline three\nhello again";
        std::fs::write(&p, content).unwrap();

        let results = search_files_impl(&dir.to_string_lossy(), "hello", false, false, false).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].line_number, 2);
        assert_eq!(results[1].line_number, 4);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_search_case_insensitive() {
        let dir = tmp("search_ci");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        std::fs::write(dir.join("t.md"), "Hello\nhello\nHELLO").unwrap();

        let results = search_files_impl(&dir.to_string_lossy(), "hello", false, false, false).unwrap();
        assert_eq!(results.len(), 3);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_search_regex() {
        let dir = tmp("search_regex");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        std::fs::write(dir.join("t.md"), "foo bar\nbaz foo\nqux").unwrap();

        let results = search_files_impl(&dir.to_string_lossy(), "fo+", true, true, false).unwrap();
        assert_eq!(results.len(), 2);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_search_empty_query() {
        let dir = tmp("search_empty");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("t.md"), "hello").unwrap();

        let results = search_files_impl(&dir.to_string_lossy(), "", false, false, false).unwrap();
        assert_eq!(results.len(), 0);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_search_invalid_directory() {
        let results = search_files_impl("/nonexistent", "hello", false, false, false);
        assert!(results.is_err());
    }

    #[test]
    fn test_search_max_results() {
        let dir = tmp("search_max");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let p = dir.join("t.md");
        let content = (0..MAX_RESULTS + 50).map(|i| format!("hello {}", i)).collect::<Vec<_>>().join("\n");
        std::fs::write(&p, content).unwrap();

        let results = search_files_impl(&dir.to_string_lossy(), "hello", false, false, false).unwrap();
        assert_eq!(results.len(), MAX_RESULTS);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_search_utf16_offsets() {
        let dir = tmp("search_utf16");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let p = dir.join("t.md");
        let content = "你好世界 hello";
        std::fs::write(&p, content).unwrap();

        let results = search_files_impl(&dir.to_string_lossy(), "hello", true, false, false).unwrap();
        assert_eq!(results.len(), 1);
        // "你好世界 " = 5 chars, each is 1 UTF-16 code unit → match_start = 5
        assert_eq!(results[0].match_start, 5);

        let _ = std::fs::remove_dir_all(&dir);
    }

    // ── replace_in_files_impl ─────────────────────────────────────────────────

    #[test]
    fn test_replace_basic() {
        let dir = tmp("replace_basic");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let p = dir.join("t.md");
        std::fs::write(&p, "hello world\nhello again").unwrap();

        let result = replace_in_files_impl(&dir.to_string_lossy(), "hello", "hi", false, false, false).unwrap();
        assert_eq!(result.replaced_count, 2);
        assert_eq!(result.files_modified.len(), 1);

        let content = std::fs::read_to_string(&p).unwrap();
        assert_eq!(content, "hi world\nhi again");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_replace_case_insensitive() {
        let dir = tmp("replace_ci");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let p = dir.join("t.md");
        std::fs::write(&p, "Hello\nhello\nHELLO").unwrap();

        let result = replace_in_files_impl(&dir.to_string_lossy(), "hello", "hi", false, false, false).unwrap();
        assert_eq!(result.replaced_count, 3);

        let content = std::fs::read_to_string(&p).unwrap();
        assert_eq!(content, "hi\nhi\nhi");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_replace_regex() {
        let dir = tmp("replace_regex");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let p = dir.join("t.md");
        std::fs::write(&p, "foo123bar\nbaz").unwrap();

        let result = replace_in_files_impl(&dir.to_string_lossy(), r"\d+", "NUM", true, true, false).unwrap();
        assert_eq!(result.replaced_count, 1);

        let content = std::fs::read_to_string(&p).unwrap();
        assert_eq!(content, "fooNUMbar\nbaz");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_replace_empty_query() {
        let dir = tmp("replace_empty");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let result = replace_in_files_impl(&dir.to_string_lossy(), "", "hi", false, false, false).unwrap();
        assert_eq!(result.replaced_count, 0);
    }

    #[test]
    fn test_replace_skips_non_text_files() {
        let dir = tmp("replace_skip");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        std::fs::write(dir.join("readme.md"), "hello").unwrap();
        std::fs::write(dir.join("image.png"), "hello").unwrap();

        let result = replace_in_files_impl(&dir.to_string_lossy(), "hello", "hi", false, false, false).unwrap();
        assert_eq!(result.replaced_count, 1);

        let _ = std::fs::remove_dir_all(&dir);
    }
}
