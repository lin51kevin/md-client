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
        .invoke_handler(tauri::generate_handler![greet, get_open_file, export_document, read_file_text, read_file_bytes, write_file_text, write_image_bytes, rename_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


