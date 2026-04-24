// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // WebKitGTK hardware compositing fails on some GPU drivers and Wayland,
        // causing the webview to render as a solid black rectangle.
        // Must be set here, before GTK/WebKit initializes.
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }
    tauri_app_lib::run()
}
