//! Cross-file search and replace functionality.
//!
//! Extracted from lib.rs to keep that file under the 800-line limit.
//! Exposes two Tauri commands: `search_files` and `replace_in_files`.

mod core;
mod types;

pub use core::*;
// Types are accessible via `search::SearchResult` / `search::ReplaceInFilesResult`
