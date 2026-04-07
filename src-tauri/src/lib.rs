// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_open_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
