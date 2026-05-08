//! Public types for the search module.

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
