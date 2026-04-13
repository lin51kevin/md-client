// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod markdown_preprocess;
mod export_pdf;
mod export_docx;
mod git;

use export_pdf::export_pdf;
use export_docx::export_docx;
use base64::Engine as _;
use tauri::Manager;
use tauri::Emitter;

/// Validate that a user-supplied path does not escape into sensitive system directories.
/// This is a defence-in-depth measure for a desktop app that wraps raw std::fs operations.
/// Rejects:
///   - Paths containing `..` segments (directory traversal)
///   - Known OS system directories (Windows: System32, etc.; Unix: /etc, /usr, etc.)
///   - Empty paths
fn validate_user_path(path: &str) -> Result<(), String> {
    if path.is_empty() {
        return Err("路径不能为空".to_string());
    }

    // Reject path traversal via ".." anywhere in the path
    let normalized = path.replace('\\', "/");
    for segment in normalized.split('/') {
        if segment == ".." {
            return Err("路径不允许包含 '..'".to_string());
        }
    }

    // Reject known sensitive system directories
    let lower = normalized.to_lowercase();
    let blocked_prefixes: &[&str] = &[
        // Windows
        "c:/windows", "c:/program files", "c:/program files (x86)",
        "c:/programdata", "c:/$recycle.bin",
        // Unix/macOS
        "/etc", "/usr", "/bin", "/sbin", "/boot", "/lib", "/lib64",
        "/proc", "/sys", "/dev", "/var/run", "/var/log",
    ];

    for prefix in blocked_prefixes {
        if lower.starts_with(prefix) {
            return Err(format!("不允许访问系统目录: {}", prefix));
        }
    }

    Ok(())
}

/// Pre-rendered image blob passed from the JS side.
/// The `data` field is a base64-encoded PNG.  `width` and `height` are the
/// pixel dimensions of the PNG at the render scale used by the frontend.
#[derive(serde::Deserialize)]
struct ExportImage {
    data: String,
    width: u32,
    height: u32,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(serde::Serialize)]
struct OpenFileResult {
    path: String,
    content: String,
}

#[tauri::command]
fn get_open_file() -> Option<OpenFileResult> {
    let args: Vec<String> = std::env::args().collect();
    // Skip args that look like Tauri/WebKit internal flags
    let file_path = args.iter().skip(1).find(|a| {
        !a.starts_with('-') && !a.starts_with("tauri") && !a.contains("://")
    });
    if let Some(path) = file_path {
        match std::fs::read_to_string(path) {
            Ok(content) => Some(OpenFileResult { path: path.clone(), content }),
            Err(_) => None,
        }
    } else {
        None
    }
}

#[tauri::command]
async fn export_document(
    markdown: String,
    output_path: String,
    format: String,
    pre_rendered_images: Option<std::collections::HashMap<String, ExportImage>>,
) -> Result<(), String> {
    validate_user_path(&output_path)?;
    // Decode base64 → raw PNG bytes + dimensions
    let images: std::collections::HashMap<String, (Vec<u8>, u32, u32)> =
        pre_rendered_images
            .unwrap_or_default()
            .into_iter()
            .filter_map(|(k, v)| {
                let bytes = base64::engine::general_purpose::STANDARD
                    .decode(&v.data)
                    .ok()?;
                // [P2-5] Reject individual images larger than 50MB to prevent OOM
                if bytes.len() > 50 * 1024 * 1024 {
                    return None;
                }
                Some((k, (bytes, v.width, v.height)))
            })
            .collect();

    // [W1] Total images size check: prevent OOM from many large images
    let total_size: usize = images.values().map(|(b, _, _)| b.len()).sum();
    const MAX_TOTAL_SIZE: usize = 200 * 1024 * 1024; // 200MB total
    if total_size > MAX_TOTAL_SIZE {
        return Err(format!(
            "总图片大小（{}MB）超过限制（200MB），请减少文档中的图片或公式数量。",
            total_size / (1024 * 1024)
        ));
    }

    match format.as_str() {
        "pdf" => export_pdf(&markdown, &output_path, &images),
        "docx" => export_docx(&markdown, &output_path, &images),
        _ => Err(format!("不支持的格式: {format}。请使用 'pdf' 或 'docx'。")),
    }
}

/// Read any file as UTF-8 text.
#[tauri::command]
fn read_file_text(path: String) -> Result<String, String> {
    validate_user_path(&path)?;
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Read any file as raw bytes.
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    validate_user_path(&path)?;
    std::fs::read(&path).map_err(|e| e.to_string())
}

/// Write text content to a file path.
#[tauri::command]
fn write_file_text(path: String, content: String) -> Result<(), String> {
    validate_user_path(&path)?;
    // Create parent directories if they don't exist
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())
}

/// Directory entry for the file tree sidebar.
#[derive(serde::Serialize, serde::Deserialize)]
struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
    is_file: bool,
    extension: Option<String>,
    children: Option<Vec<DirEntry>>,
}

/// List a single directory (non-recursive). Returns entries filtered to show
/// directories and supported text files (.md, .markdown, .txt).
#[tauri::command]
fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    validate_user_path(&path)?;
    let dir = std::path::Path::new(&path);
    if !dir.exists() {
        return Err(format!("目录不存在: {}", path));
    }
    if !dir.is_dir() {
        return Err(format!("路径不是目录: {}", path));
    }

    let mut entries: Vec<DirEntry> = std::fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .filter(|entry| {
            // Hide hidden files/dirs (starting with '.')
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if name_str.starts_with('.') { return false; }
            // Show directories and known text files only
            if entry.path().is_dir() { return true; }
            if !entry.path().is_file() { return false; }
            let ext = entry.path()
                .extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_lowercase());
            matches!(ext.as_deref(), Some("md") | Some("markdown") | Some("txt"))
        })
        .map(|entry| {
            let p = entry.path();
            let ext = p.extension().and_then(|e| e.to_str()).map(|s| s.to_string());
            DirEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                path: p.to_string_lossy().to_string(),
                is_dir: p.is_dir(),
                is_file: p.is_file(),
                extension: ext,
                children: None,
            }
        })
        .collect();

    // Sort: directories first, then files, alphabetically within each group
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

/// Recursively list directory up to `depth` levels.
#[tauri::command]
fn read_dir_recursive(path: String, depth: Option<u32>) -> Result<DirEntry, String> {
    validate_user_path(&path)?;
    fn read_recursive(dir_path: &std::path::Path, current_depth: u32, max_depth: u32) -> Result<DirEntry, String> {
        let name = dir_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(dir_path.to_string_lossy().as_ref())
            .to_string();
        let base = DirEntry {
            name: name.clone(),
            path: dir_path.to_string_lossy().to_string(),
            is_dir: true,
            is_file: false,
            extension: None,
            children: None,
        };

        if current_depth >= max_depth || !dir_path.is_dir() {
            return Ok(base);
        }

        let children: Vec<DirEntry> = std::fs::read_dir(dir_path)
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .filter(|entry| {
                let file_name = entry.file_name();
                let name_str = file_name.to_string_lossy();
                if name_str.starts_with('.') { return false; }
                if entry.path().is_dir() { return true; }
                if !entry.path().is_file() { return false; }
                let ext = entry.path().extension().and_then(|e| e.to_str()).map(|s| s.to_lowercase());
                matches!(ext.as_deref(), Some("md") | Some("markdown") | Some("txt"))
            })
            .filter_map(|entry| {
                let p = entry.path();
                let ext = p.extension().and_then(|e| e.to_str()).map(|s| s.to_string());
                if p.is_dir() {
                    read_recursive(&p, current_depth + 1, max_depth).ok()
                } else {
                    Some(DirEntry {
                        name: entry.file_name().to_string_lossy().to_string(),
                        path: p.to_string_lossy().to_string(),
                        is_dir: false,
                        is_file: true,
                        extension: ext,
                        children: None,
                    })
                }
            })
            .collect();

        Ok(DirEntry { children: Some(children), ..base })
    }

    let d = depth.unwrap_or(2);
    read_recursive(std::path::Path::new(&path), 0, d)
}

/// Cross-file search result.
#[derive(serde::Serialize, Clone)]
struct SearchResult {
    file_path: String,
    file_name: String,
    line_number: u32,
    line_content: String,
    match_start: usize,
    match_end: usize,
}

fn build_search_regex(
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

/// Search for text across all .md/.markdown/.txt files in a directory (recursive).
#[tauri::command]
fn search_files(
    directory: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
    whole_word: bool,
) -> Result<Vec<SearchResult>, String> {
    validate_user_path(&directory)?;
    if query.is_empty() {
        return Ok(Vec::new());
    }

    const MAX_RESULTS: usize = 200;
    let mut results = Vec::new();

    fn is_text_file(path: &std::path::Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|s| matches!(s.to_lowercase().as_str(), "md" | "markdown" | "txt"))
            .unwrap_or(false)
    }

    fn collect_files(dir: &std::path::Path) -> Vec<std::path::PathBuf> {
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

    let dir_path = std::path::Path::new(&directory);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(format!("目录不存在或不是目录: {}", directory));
    }

    let files = collect_files(dir_path);

    let regex = build_search_regex(&query, case_sensitive, use_regex, whole_word)?;

    let pattern = if case_sensitive { query.clone() } else { query.to_lowercase() };

    'outer: for filepath in files {
        if results.len() >= MAX_RESULTS {
            break;
        }

        match std::fs::read_to_string(&filepath) {
            Ok(content) => {
                let fname = filepath.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("?")
                    .to_string();
                let fpath = filepath.to_string_lossy().to_string();

                for (line_idx, line) in content.lines().enumerate() {
                    if results.len() >= MAX_RESULTS {
                        break 'outer;
                    }

                    let found = if let Some(ref r) = regex {
                        r.find(line).is_some()
                    } else if case_sensitive {
                        line.contains(&pattern.as_str())
                    } else {
                        line.to_lowercase().contains(&pattern)
                    };

                    if found {
                        // Compute match range in this line
                        let (ms, me) = if let Some(ref r) = regex {
                            if let Some(m) = r.find(line) {
                                (m.start(), m.end())
                            } else { (0, 0) }
                        } else if case_sensitive {
                            let pos = line.find(&pattern).unwrap_or(0);
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
                        });
                    }
                }
            }
            Err(_) => { /* skip unreadable files */ }
        }
    }

    Ok(results)
}

#[derive(serde::Serialize)]
struct ReplaceInFilesResult {
    replaced_count: u32,
    files_modified: Vec<String>,
}

/// Replace text across all .md/.markdown/.txt files in a directory (recursive).
#[tauri::command]
fn replace_in_files(
    directory: String,
    query: String,
    replacement: String,
    case_sensitive: bool,
    use_regex: bool,
    whole_word: bool,
) -> Result<ReplaceInFilesResult, String> {
    validate_user_path(&directory)?;
    if query.is_empty() {
        return Ok(ReplaceInFilesResult { replaced_count: 0, files_modified: vec![] });
    }

    fn is_text_file(path: &std::path::Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|s| matches!(s.to_lowercase().as_str(), "md" | "markdown" | "txt"))
            .unwrap_or(false)
    }

    fn collect_files(dir: &std::path::Path) -> Vec<std::path::PathBuf> {
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

    let dir_path = std::path::Path::new(&directory);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(format!("目录不存在或不是目录: {}", directory));
    }

    let re = build_search_regex(&query, case_sensitive, use_regex, whole_word)?;

    let pattern_lower = query.to_lowercase();
    let mut replaced_count = 0u32;
    let mut files_modified = Vec::new();

    for filepath in collect_files(dir_path) {
        let content = match std::fs::read_to_string(&filepath) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let (new_content, count) = if let Some(ref r) = re {
            let count = r.find_iter(&content).count() as u32;
            if count == 0 { continue; }
            (r.replace_all(&content, replacement.as_str()).to_string(), count)
        } else {
            let needle = if case_sensitive { query.as_str() } else { pattern_lower.as_str() };
            let haystack = if case_sensitive { content.clone() } else { content.to_lowercase() };
            let count = haystack.matches(needle).count() as u32;
            if count == 0 { continue; }
            let new = if case_sensitive {
                content.replace(needle, &replacement)
            } else {
                // Case-insensitive plain text replacement — use char-boundary-safe scanning.
                // to_lowercase() can change byte lengths (e.g. 'İ' → 'i\u{307}'), so we
                // cannot assume byte offsets in `content` correspond 1:1 with `lower`.
                // Instead, find matches in the lowered string with str::find and track
                // original-content offsets by preserving char boundary alignment.
                let lower = content.to_lowercase();
                let needle = &pattern_lower;
                let mut result = String::with_capacity(content.len());
                let mut lower_start = 0usize;
                let mut orig_start = 0usize;

                // Build a mapping: for each byte offset in `lower`, find the
                // corresponding byte offset in `content` by walking chars in parallel.
                let orig_chars: Vec<(usize, char)> = content.char_indices().collect();
                let lower_chars: Vec<(usize, char)> = lower.char_indices().collect();
                // Map from char index → (orig_byte_offset, lower_byte_offset)
                // Both strings have the same number of chars.
                let char_count = orig_chars.len();

                // Find matches in the lowered string
                let mut char_idx = 0usize;
                loop {
                    if let Some(match_pos) = lower[lower_start..].find(needle.as_str()) {
                        let lower_match = lower_start + match_pos;
                        let lower_match_end = lower_match + needle.len();

                        // Find char index for lower_match and lower_match_end
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
                        result.push_str(&replacement);
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
        files_modified.push(filepath.to_string_lossy().to_string());
    }

    Ok(ReplaceInFilesResult { replaced_count, files_modified })
}

/// Write raw bytes (e.g. image data) to a file path.
#[tauri::command]
fn write_image_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    validate_user_path(&path)?;
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

/// Create a new file (and parent directories if needed).
#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    validate_user_path(&path)?;
    let p = std::path::Path::new(&path);
    if p.exists() {
        return Err(format!("文件已存在: {}", path));
    }
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&p, "").map_err(|e| e.to_string())
}

/// Delete a file or empty directory.
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    validate_user_path(&path)?;
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err(format!("文件不存在: {}", path));
    }
    // Safety: only allow deleting files (not non-empty dirs)
    if p.is_dir() {
        std::fs::remove_dir(p).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    validate_user_path(&old_path)?;
    validate_user_path(&new_path)?;
    let new = std::path::Path::new(&new_path);
    // Reject if target already exists (std::fs::rename is atomic-replace on Unix
    // but errors on Windows — enforce consistent cross-platform behaviour)
    if new.exists() {
        return Err(format!("FILE_EXISTS:{}", new.file_name().unwrap_or_default().to_string_lossy()));
    }
    std::fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // When a second instance is launched, extract the file path from args
            // and emit an event to the existing window
            let file_path = args.iter().skip(1).find(|a| {
                !a.starts_with('-') && !a.starts_with("tauri") && !a.contains("://")
            });
            
            if let Some(path) = file_path {
                // Emit event to frontend with the file path
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("open-file", path.clone());
                    // Focus and unminimize the window
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            } else {
                // No file path — just focus the existing window
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        }))
        .invoke_handler(tauri::generate_handler![greet, get_open_file, export_document, read_file_text, read_file_bytes, write_file_text, write_image_bytes, create_file, delete_file, rename_file, list_directory, read_dir_recursive, search_files, replace_in_files, git::git_get_repo, git::git_get_status, git::git_diff, git::git_commit, git::git_pull, git::git_push, git::git_stage, git::git_unstage, git::git_restore])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


