// ---------------------------------------------------------------------------
// Markdown preprocessing — strip remark-directive syntax unsupported by pulldown-cmark
// ---------------------------------------------------------------------------

/// Remove `:::name{...}` container-directive opening/closing lines.
/// The remark-directive JS plugin uses these for custom containers (e.g. details blocks).
/// pulldown-cmark does not understand them and renders them as literal text.
/// We keep the content *between* the markers so headings, code blocks, tables, etc.
/// inside a directive are still exported.
///
/// We also ensure the closing `:::` is preceded by a blank line so that a `:::`
/// that immediately follows a GFM table is not mistakenly parsed as a table row.
fn replace_emoji_shortcodes(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut chars = text.char_indices().peekable();
    
    while let Some((i, c)) = chars.next() {
        if c == ':' {
            if let Some(end) = text[i + 1..].find(':') {
                let shortcode = &text[i + 1..i + 1 + end];
                if !shortcode.is_empty() && shortcode.chars().all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '+' || ch == '-') {
                    if let Some(emoji) = emojis::get_by_shortcode(shortcode) {
                        result.push_str(emoji.as_str());
                        for _ in 0..end + 1 {
                            chars.next();
                        }
                        continue;
                    }
                }
            }
        }
        result.push(c);
    }
    result
}

pub fn preprocess_markdown(markdown: &str) -> String {
    // [P1-1] Strip YAML frontmatter (--- ... ---) at the start of the document.
    // Only treat the opening "---" as frontmatter when it is on its own line
    // (i.e. the document starts with "---\n") to avoid misidentifying a bare
    // horizontal-rule that happens to be the first line.
    let md = if markdown.starts_with("---\n") {
        // Look for the closing delimiter: a line that is exactly "---" (with
        // optional trailing whitespace) followed by a newline or end-of-string.
        if let Some(rel) = markdown[4..].find("\n---\n").or_else(|| {
            // Handle the case where the closing "---" is the very last line.
            markdown[4..].strip_suffix("\n---").map(|s| s.len())
        }) {
            let after = markdown[4 + rel + 5..].trim_start_matches('\n');
            if after.is_empty() { "" } else { after }
        } else {
            markdown
        }
    } else {
        markdown
    };

    let mut in_fenced_code = false;
    let mut result: Vec<String> = Vec::new();
    let mut prev_was_table_row = false;

    for line in md.lines() {
        let trimmed = line.trim_start();

        // Track fenced code block boundaries
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            in_fenced_code = !in_fenced_code;
            result.push(line.to_string());
            prev_was_table_row = false;
            continue;
        }

        if in_fenced_code {
            result.push(line.to_string());
            continue;
        }

        // Skip directive container markers
        if trimmed.starts_with(":::") {
            // If previous line was a table row, insert a blank line first so
            // pulldown-cmark doesn't absorb the next content into the table.
            if prev_was_table_row {
                result.push("".to_string());
            }
            prev_was_table_row = false;
            continue; // drop the ::: line entirely
        }

        prev_was_table_row = trimmed.starts_with('|') && trimmed.ends_with('|');
        result.push(replace_emoji_shortcodes(line));
    }
    result.join("\n")
}
