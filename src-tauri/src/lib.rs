// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod markdown_preprocess;
mod export_pdf;
mod export_docx;

use export_pdf::export_pdf;
use export_docx::export_docx;

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
async fn export_document(markdown: String, output_path: String, format: String) -> Result<(), String> {
    match format.as_str() {
        "pdf" => export_pdf(&markdown, &output_path),
        "docx" => export_docx(&markdown, &output_path),
        _ => Err(format!("不支持的格式: {format}。请使用 'pdf' 或 'docx'。")),
    }
}

/// Read any file as UTF-8 text — bypasses plugin-fs scope restrictions.
#[tauri::command]
fn read_file_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Read any file as raw bytes — bypasses plugin-fs scope restrictions.
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

/// Write text content to any file path — bypasses plugin-fs scope restrictions.
#[tauri::command]
fn write_file_text(path: String, content: String) -> Result<(), String> {
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
                let name_str = entry.file_name().to_string_lossy();
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

/// Search for text across all .md/.markdown/.txt files in a directory (recursive).
#[tauri::command]
fn search_files(
    directory: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
) -> Result<Vec<SearchResult>, String> {
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

    // Build regex or plain matcher
    let re: Result<Option<regex::Regex>, _> = if use_regex {
        regex::RegexBuilder::new(&query)
            .case_insensitive(!case_sensitive)
            .build()
            .map(Some)
    } else {
        Ok(None)
    };
    let regex = re.map_err(|e| format!("正则表达式错误: {}", e))?;

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

/// Write raw bytes (e.g. image data) to any file path — bypasses plugin-fs scope restrictions.
#[tauri::command]
fn write_image_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
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
        .invoke_handler(tauri::generate_handler![greet, get_open_file, export_document, read_file_text, read_file_bytes, write_file_text, write_image_bytes, rename_file, list_directory, read_dir_recursive, search_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


