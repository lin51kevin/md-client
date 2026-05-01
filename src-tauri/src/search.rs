//! Cross-file search and replace functionality.
//!
//! Extracted from lib.rs to keep that file under the 800-line limit.
//! Exposes two Tauri commands: `search_files` and `replace_in_files`.

use crate::read_text_auto_encoding;
use crate::validate_user_path;

// ── Public types ──────────────────────────────────────────────────────────────

/// Single search hit returned to the frontend.
#[derive(serde::Serialize, Clone)]
pub struct SearchResult {
    pub file_path: String,
    pub file_name: String,
    pub line_number: u32,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
    pub context_before: Option<String>,
    pub context_after: Option<String>,
}

/// Summary returned after a bulk replace operation.
#[derive(serde::Serialize)]
pub struct ReplaceInFilesResult {
    pub replaced_count: u32,
    pub files_modified: Vec<String>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
        // Support extensionless filenames like Dockerfile, Makefile
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

// ── Implementation functions (testable without Tauri runtime) ─────────────────

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
                r.find(line).map(|m| (m.start(), m.end())).unwrap_or((0, 0))
            } else if case_sensitive {
                let pos = line.find(pattern.as_str()).unwrap_or(0);
                (pos, pos + pattern.len())
            } else {
                let lower = line.to_lowercase();
                let pos = lower.find(&pattern).unwrap_or(0);
                (pos, pos + pattern.len())
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
                // Case-insensitive plain text replacement — char-boundary-safe.
                // to_lowercase() can change byte lengths (e.g. 'İ' → 'i\u{307}'), so we
                // cannot assume byte offsets in `content` correspond 1:1 with `lower`.
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

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    // ── Test helpers ──────────────────────────────────────────────────────────

    /// Create a temporary directory with a unique name.
    fn tmp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("marklite_search_test_{}", name));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// Write content to a file inside a temp dir and return the file path.
    fn write_file(dir: &PathBuf, name: &str, content: &str) -> PathBuf {
        let p = dir.join(name);
        fs::write(&p, content).unwrap();
        p
    }

    /// Remove the temp dir (best-effort, won't fail the test).
    fn cleanup(dir: &PathBuf) {
        let _ = fs::remove_dir_all(dir);
    }

    // ── build_search_regex ────────────────────────────────────────────────────

    #[test]
    fn regex_none_for_plain_case_insensitive() {
        // Plain text + case-insensitive → no regex needed
        let r = build_search_regex("hello", false, false, false).unwrap();
        assert!(r.is_none());
    }

    #[test]
    fn regex_none_for_plain_case_sensitive() {
        let r = build_search_regex("hello", true, false, false).unwrap();
        assert!(r.is_none());
    }

    #[test]
    fn regex_some_for_whole_word() {
        let r = build_search_regex("foo", true, false, true).unwrap();
        assert!(r.is_some());
        let re = r.unwrap();
        assert!(re.is_match("foo bar"));
        assert!(!re.is_match("foobar"));
    }

    #[test]
    fn regex_some_for_use_regex() {
        let r = build_search_regex("fo+", true, true, false).unwrap();
        assert!(r.is_some());
        let re = r.unwrap();
        assert!(re.is_match("foooo"));
        assert!(!re.is_match("bar"));
    }

    #[test]
    fn regex_case_insensitive_flag() {
        let r = build_search_regex("Hello", false, true, false).unwrap().unwrap();
        assert!(r.is_match("HELLO"));
        assert!(r.is_match("hello"));
    }

    #[test]
    fn regex_invalid_pattern_returns_error() {
        let r = build_search_regex("[invalid", true, true, false);
        assert!(r.is_err());
        assert!(r.unwrap_err().contains("正则表达式错误"));
    }

    // ── is_text_file ──────────────────────────────────────────────────────────

    #[test]
    fn text_file_md() {
        assert!(is_text_file(std::path::Path::new("README.md")));
    }

    #[test]
    fn text_file_markdown() {
        assert!(is_text_file(std::path::Path::new("notes.markdown")));
    }

    #[test]
    fn text_file_txt() {
        assert!(is_text_file(std::path::Path::new("notes.txt")));
    }

    #[test]
    fn text_file_rejects_rs() {
        assert!(!is_text_file(std::path::Path::new("main.rs")));
    }

    #[test]
    fn text_file_rejects_no_extension() {
        assert!(!is_text_file(std::path::Path::new("README")));
    }

    #[test]
    fn text_file_dockerfile() {
        assert!(is_text_file(std::path::Path::new("Dockerfile")));
        assert!(is_text_file(std::path::Path::new("dockerfile")));
    }

    #[test]
    fn text_file_makefile() {
        assert!(is_text_file(std::path::Path::new("Makefile")));
        assert!(is_text_file(std::path::Path::new("makefile")));
    }

    #[test]
    fn text_file_case_insensitive_ext() {
        assert!(is_text_file(std::path::Path::new("README.MD")));
    }

    // ── collect_files ─────────────────────────────────────────────────────────

    #[test]
    fn collect_files_finds_md_files() {
        let dir = tmp_dir("collect_basic");
        write_file(&dir, "a.md", "hello");
        write_file(&dir, "b.txt", "world");
        write_file(&dir, "c.rs", "fn main() {}");

        let files = collect_files(&dir);
        let names: Vec<String> = files
            .iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
            .collect();

        assert!(names.contains(&"a.md".to_string()));
        assert!(names.contains(&"b.txt".to_string()));
        assert!(!names.contains(&"c.rs".to_string()));

        cleanup(&dir);
    }

    #[test]
    fn collect_files_skips_hidden() {
        let dir = tmp_dir("collect_hidden");
        write_file(&dir, ".hidden.md", "secret");
        write_file(&dir, "visible.md", "public");

        let files = collect_files(&dir);
        let names: Vec<String> = files
            .iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
            .collect();

        assert!(!names.contains(&".hidden.md".to_string()));
        assert!(names.contains(&"visible.md".to_string()));

        cleanup(&dir);
    }

    #[test]
    fn collect_files_recurses_into_subdirs() {
        let dir = tmp_dir("collect_recurse");
        let sub = dir.join("sub");
        fs::create_dir_all(&sub).unwrap();
        write_file(&dir, "root.md", "root");
        write_file(&sub, "child.md", "child");

        let files = collect_files(&dir);
        assert_eq!(files.len(), 2);

        cleanup(&dir);
    }

    #[test]
    fn collect_files_skips_hidden_subdir() {
        let dir = tmp_dir("collect_hidden_dir");
        let hidden_sub = dir.join(".git");
        fs::create_dir_all(&hidden_sub).unwrap();
        write_file(&hidden_sub, "config.md", "inside hidden dir");
        write_file(&dir, "visible.md", "visible");

        let files = collect_files(&dir);
        assert_eq!(files.len(), 1);

        cleanup(&dir);
    }

    // ── search_files_impl ─────────────────────────────────────────────────────

    #[test]
    fn search_returns_empty_for_empty_query() {
        let dir = tmp_dir("search_empty_query");
        write_file(&dir, "a.md", "hello world");
        let results = search_files_impl(&dir.to_string_lossy(), "", false, false, false).unwrap();
        assert!(results.is_empty());
        cleanup(&dir);
    }

    #[test]
    fn search_returns_error_for_missing_dir() {
        let err = search_files_impl("/nonexistent_dir_marklite", "foo", false, false, false);
        assert!(err.is_err());
    }

    #[test]
    fn search_finds_plain_text() {
        let dir = tmp_dir("search_plain");
        write_file(&dir, "a.md", "hello world\ngoodbye");

        let results = search_files_impl(&dir.to_string_lossy(), "hello", false, false, false).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].line_number, 1);
        assert_eq!(results[0].line_content, "hello world");

        cleanup(&dir);
    }

    #[test]
    fn search_case_insensitive() {
        let dir = tmp_dir("search_case_insensitive");
        write_file(&dir, "a.md", "HELLO world\ngoodbye");

        let results = search_files_impl(&dir.to_string_lossy(), "hello", false, false, false).unwrap();
        assert_eq!(results.len(), 1);

        cleanup(&dir);
    }

    #[test]
    fn search_case_sensitive_no_match() {
        let dir = tmp_dir("search_case_sens_nomatch");
        write_file(&dir, "a.md", "HELLO world");

        let results = search_files_impl(&dir.to_string_lossy(), "hello", true, false, false).unwrap();
        assert!(results.is_empty());

        cleanup(&dir);
    }

    #[test]
    fn search_case_sensitive_match() {
        let dir = tmp_dir("search_case_sens_match");
        write_file(&dir, "a.md", "hello world");

        let results = search_files_impl(&dir.to_string_lossy(), "hello", true, false, false).unwrap();
        assert_eq!(results.len(), 1);

        cleanup(&dir);
    }

    #[test]
    fn search_with_regex() {
        let dir = tmp_dir("search_regex");
        write_file(&dir, "a.md", "foo123\nbar456\nbaz");

        let results = search_files_impl(&dir.to_string_lossy(), r"\d+", false, true, false).unwrap();
        assert_eq!(results.len(), 2);

        cleanup(&dir);
    }

    #[test]
    fn search_whole_word_only() {
        let dir = tmp_dir("search_whole_word");
        write_file(&dir, "a.md", "foo foobar bar");

        let results = search_files_impl(&dir.to_string_lossy(), "foo", true, false, true).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].match_start, 0);
        assert_eq!(results[0].match_end, 3);

        cleanup(&dir);
    }

    #[test]
    fn search_provides_context_lines() {
        let dir = tmp_dir("search_context");
        write_file(&dir, "a.md", "before\ntarget\nafter");

        let results = search_files_impl(&dir.to_string_lossy(), "target", false, false, false).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].context_before.as_deref(), Some("before"));
        assert_eq!(results[0].context_after.as_deref(), Some("after"));

        cleanup(&dir);
    }

    #[test]
    fn search_first_line_has_no_context_before() {
        let dir = tmp_dir("search_ctx_first");
        write_file(&dir, "a.md", "target\nnext");

        let results = search_files_impl(&dir.to_string_lossy(), "target", false, false, false).unwrap();
        assert!(results[0].context_before.is_none());
        assert_eq!(results[0].context_after.as_deref(), Some("next"));

        cleanup(&dir);
    }

    #[test]
    fn search_last_line_has_no_context_after() {
        let dir = tmp_dir("search_ctx_last");
        write_file(&dir, "a.md", "prev\ntarget");

        let results = search_files_impl(&dir.to_string_lossy(), "target", false, false, false).unwrap();
        assert_eq!(results[0].context_before.as_deref(), Some("prev"));
        assert!(results[0].context_after.is_none());

        cleanup(&dir);
    }

    #[test]
    fn search_respects_max_results_cap() {
        let dir = tmp_dir("search_max_results");
        // Write a file with MAX_RESULTS + 10 matching lines
        let content: String = (0..MAX_RESULTS + 10)
            .map(|i| format!("match line {}\n", i))
            .collect();
        write_file(&dir, "big.md", &content);

        let results = search_files_impl(&dir.to_string_lossy(), "match", false, false, false).unwrap();
        assert_eq!(results.len(), MAX_RESULTS);

        cleanup(&dir);
    }

    #[test]
    fn search_records_match_offsets() {
        let dir = tmp_dir("search_offsets");
        write_file(&dir, "a.md", "hello world");

        let results = search_files_impl(&dir.to_string_lossy(), "world", true, false, false).unwrap();
        assert_eq!(results[0].match_start, 6);
        assert_eq!(results[0].match_end, 11);

        cleanup(&dir);
    }

    // ── replace_in_files_impl ─────────────────────────────────────────────────

    #[test]
    fn replace_returns_zero_for_empty_query() {
        let dir = tmp_dir("replace_empty_query");
        write_file(&dir, "a.md", "hello world");

        let result = replace_in_files_impl(
            &dir.to_string_lossy(), "", "replacement", false, false, false
        ).unwrap();
        assert_eq!(result.replaced_count, 0);
        assert!(result.files_modified.is_empty());

        cleanup(&dir);
    }

    #[test]
    fn replace_returns_error_for_missing_dir() {
        let err = replace_in_files_impl(
            "/nonexistent_dir_marklite", "foo", "bar", false, false, false
        );
        assert!(err.is_err());
    }

    #[test]
    fn replace_plain_text_case_sensitive() {
        let dir = tmp_dir("replace_plain_cs");
        let file = write_file(&dir, "a.md", "hello world hello");

        let result = replace_in_files_impl(
            &dir.to_string_lossy(), "hello", "hi", true, false, false
        ).unwrap();

        assert_eq!(result.replaced_count, 2);
        assert_eq!(result.files_modified.len(), 1);
        let content = fs::read_to_string(&file).unwrap();
        assert_eq!(content, "hi world hi");

        cleanup(&dir);
    }

    #[test]
    fn replace_plain_text_case_insensitive() {
        let dir = tmp_dir("replace_plain_ci");
        let file = write_file(&dir, "a.md", "Hello HELLO hello");

        let result = replace_in_files_impl(
            &dir.to_string_lossy(), "hello", "hi", false, false, false
        ).unwrap();

        assert_eq!(result.replaced_count, 3);
        let content = fs::read_to_string(&file).unwrap();
        assert_eq!(content, "hi hi hi");

        cleanup(&dir);
    }

    #[test]
    fn replace_with_regex() {
        let dir = tmp_dir("replace_regex");
        let file = write_file(&dir, "a.md", "foo123 bar456");

        let result = replace_in_files_impl(
            &dir.to_string_lossy(), r"\d+", "NUM", false, true, false
        ).unwrap();

        assert_eq!(result.replaced_count, 2);
        let content = fs::read_to_string(&file).unwrap();
        assert_eq!(content, "fooNUM barNUM");

        cleanup(&dir);
    }

    #[test]
    fn replace_whole_word_only() {
        let dir = tmp_dir("replace_whole_word");
        let file = write_file(&dir, "a.md", "foo foobar baz");

        let result = replace_in_files_impl(
            &dir.to_string_lossy(), "foo", "X", true, false, true
        ).unwrap();

        // Only standalone "foo" is replaced, "foobar" is untouched
        assert_eq!(result.replaced_count, 1);
        let content = fs::read_to_string(&file).unwrap();
        assert_eq!(content, "X foobar baz");

        cleanup(&dir);
    }

    #[test]
    fn replace_no_match_leaves_file_unchanged() {
        let dir = tmp_dir("replace_no_match");
        let file = write_file(&dir, "a.md", "hello world");

        let result = replace_in_files_impl(
            &dir.to_string_lossy(), "zzz", "X", false, false, false
        ).unwrap();

        assert_eq!(result.replaced_count, 0);
        assert!(result.files_modified.is_empty());
        let content = fs::read_to_string(&file).unwrap();
        assert_eq!(content, "hello world");

        cleanup(&dir);
    }

    #[test]
    fn replace_across_multiple_files() {
        let dir = tmp_dir("replace_multi");
        write_file(&dir, "a.md", "hello");
        write_file(&dir, "b.md", "hello world");
        write_file(&dir, "c.md", "goodbye");

        let result = replace_in_files_impl(
            &dir.to_string_lossy(), "hello", "hi", true, false, false
        ).unwrap();

        assert_eq!(result.replaced_count, 2);
        assert_eq!(result.files_modified.len(), 2);

        cleanup(&dir);
    }

    #[test]
    fn replace_invalid_regex_returns_error() {
        let dir = tmp_dir("replace_bad_regex");
        write_file(&dir, "a.md", "hello");

        let err = replace_in_files_impl(
            &dir.to_string_lossy(), "[invalid", "X", false, true, false
        );
        assert!(err.is_err());

        cleanup(&dir);
    }
}
