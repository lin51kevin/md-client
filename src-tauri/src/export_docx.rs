use std::fs;
use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd, HeadingLevel, CodeBlockKind};
use docx_rs::*;

use crate::markdown_preprocess::preprocess_markdown;

/// Generate list item prefix (e.g., "1. ", "• ", "◦ ")
fn list_prefix(list_stack: &[Option<u64>], item_counter: &mut [u64], indent_level: usize) -> String {
    let is_ordered = list_stack.last().copied().flatten().is_some();
    if is_ordered {
        if let Some(counter) = item_counter.last_mut() {
            let num = *counter;
            *counter += 1;
            format!("{}. ", num)
        } else {
            "• ".to_string()
        }
    } else {
        match indent_level {
            1 => "• ".to_string(),
            2 => "◦ ".to_string(),
            _ => "▪ ".to_string(),
        }
    }
}

pub fn export_docx(markdown: &str, output_path: &str) -> Result<(), String> {
    let options = Options::ENABLE_TABLES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS;
    let preprocessed = preprocess_markdown(markdown);
    let parser = Parser::new_ext(&preprocessed, options);

    let mut docx = Docx::new();
    let mut current_runs: Vec<Run> = Vec::new();
    let mut is_bold = false;
    let mut is_italic = false;
    let mut is_strikethrough = false;
    let mut in_code_block = false;
    let mut code_block_text = String::new();
    let mut code_block_lang = String::new();
    let mut heading_level: Option<HeadingLevel> = None;
    let mut heading_runs: Vec<Run> = Vec::new();
    let mut in_blockquote = false;
    let mut in_link = false;
    let mut in_list_item = false;
    let mut first_block_in_item = false;
    let mut list_stack: Vec<Option<u64>> = Vec::new(); // None = unordered, Some = ordered
    let mut item_counter: Vec<u64> = Vec::new();

    // Table state — all rows (header + data) are stored in ONE vec.
    // Each entry is (is_header: bool, cells: Vec<Vec<Run>>).
    // is_header is true for rows inside <TableHead>, false otherwise.
    let mut in_table = false;
    let mut in_table_head = false;
    let mut table_all_rows: Vec<(bool, Vec<Vec<Run>>)> = Vec::new();
    let mut current_row_cells: Vec<Vec<Run>> = Vec::new();
    let mut current_cell_runs: Vec<Run> = Vec::new();
    let mut table_col_count = 0;

    fn build_run(text: &str, bold: bool, italic: bool, strikethrough: bool, blockquote: bool, link: bool) -> Run {
        let mut run = Run::new().add_text(text);
        if bold { run = run.bold(); }
        if italic || blockquote { run = run.italic(); }
        if strikethrough { run = run.strike(); }
        if blockquote { run = run.color("666666"); }
        if link { run = run.color("35D7BB"); }
        run
    }

    fn flush_runs(runs: &mut Vec<Run>) -> Vec<Run> {
        let result = runs.clone();
        runs.clear();
        result
    }

    for event in parser {
        match event {
            // --- Headings ---
            Event::Start(Tag::Heading { level, .. }) => {
                heading_level = Some(level);
                heading_runs.clear();
            }
            Event::End(TagEnd::Heading(_)) => {
                // (font size in half-points, space_before twips, space_after twips, underline)
                let (style, font_size, space_before, space_after, add_underline) = match heading_level {
                    Some(HeadingLevel::H1) => ("Heading1", 44usize, 330u32, 110u32, false),
                    Some(HeadingLevel::H2) => ("Heading2", 33usize, 440u32,  44u32, true),
                    Some(HeadingLevel::H3) => ("Heading3", 28usize, 330u32, 110u32, false),
                    Some(HeadingLevel::H4) => ("Heading4", 22usize, 330u32, 110u32, false),
                    Some(HeadingLevel::H5) => ("Heading5", 20usize, 330u32, 110u32, false),
                    Some(HeadingLevel::H6) => ("Heading6", 18usize, 330u32, 110u32, false),
                    _ =>                      ("Heading1", 44usize, 330u32, 110u32, false),
                };
                let spacing = LineSpacing::new().before(space_before).after(space_after);
                let mut p = Paragraph::new()
                    .style(style)
                    .line_spacing(spacing);

                if add_underline {
                    p.property = p.property.set_borders(
                        ParagraphBorders::with_empty()
                            .set(ParagraphBorder::new(ParagraphBorderPosition::Bottom)
                                .val(BorderType::Single)
                                .color("C0C0C0")
                                .size(6)   // 0.75pt line
                                .space(4)) // 12pt gap between text and line   
                    );
                }

                for run in heading_runs.drain(..) {
                    let r = run.bold().size(font_size);
                    p = p.add_run(r);
                }
                docx = docx.add_paragraph(p);
                heading_level = None;
            }

            // --- Paragraphs ---
            Event::Start(Tag::Paragraph) => {
                if !in_code_block && !in_table {
                    current_runs.clear();
                }
            }
            Event::End(TagEnd::Paragraph) => {
                if in_table {
                    // paragraph inside table cell — runs go to cell
                } else if !in_code_block {
                    let runs = flush_runs(&mut current_runs);
                    let mut p = Paragraph::new().line_spacing(LineSpacing::new().after(220));

                    if in_blockquote {
                        // Add left indent for blockquote
                        p = p.indent(Some(400), None, None, None);
                    }

                    if in_list_item {
                        let indent_level = list_stack.len();
                        let indent_twips = (indent_level as i32) * 360;
                        p = p.indent(Some(indent_twips), Some(SpecialIndentType::Hanging(180)), None, None);

                        if first_block_in_item {
                            let prefix = list_prefix(&list_stack, &mut item_counter, indent_level);
                            p = p.add_run(Run::new().add_text(&prefix));
                            first_block_in_item = false;
                        }
                    }

                    for run in runs {
                        p = p.add_run(run);
                    }
                    docx = docx.add_paragraph(p);
                }
            }

            // --- Inline formatting ---
            Event::Start(Tag::Strong) => { is_bold = true; }
            Event::End(TagEnd::Strong) => { is_bold = false; }
            Event::Start(Tag::Emphasis) => { is_italic = true; }
            Event::End(TagEnd::Emphasis) => { is_italic = false; }
            Event::Start(Tag::Strikethrough) => { is_strikethrough = true; }
            Event::End(TagEnd::Strikethrough) => { is_strikethrough = false; }

            // --- Lists ---
            Event::Start(Tag::List(start_num)) => {
                list_stack.push(start_num);
                item_counter.push(start_num.unwrap_or(1));
            }
            Event::End(TagEnd::List(_)) => {
                list_stack.pop();
                item_counter.pop();
            }
            Event::Start(Tag::Item) => {
                current_runs.clear();
                in_list_item = true;
                first_block_in_item = true;
            }
            Event::End(TagEnd::Item) => {
                in_list_item = false;
                // If there are leftover runs (e.g., text not wrapped in a paragraph)
                if !current_runs.is_empty() {
                    let indent_level = list_stack.len();
                    let indent_twips = (indent_level as i32) * 360;
                    let mut p = Paragraph::new()
                        .indent(Some(indent_twips), Some(SpecialIndentType::Hanging(180)), None, None)
                        .line_spacing(LineSpacing::new().after(55));

                    if first_block_in_item {
                        let prefix = list_prefix(&list_stack, &mut item_counter, indent_level);
                        p = p.add_run(Run::new().add_text(&prefix));
                        first_block_in_item = false;
                    }

                    for run in flush_runs(&mut current_runs) {
                        p = p.add_run(run);
                    }
                    docx = docx.add_paragraph(p);
                }
            }

            // --- Code blocks ---
            Event::Start(Tag::CodeBlock(kind)) => {
                in_code_block = true;
                code_block_text.clear();
                code_block_lang = match kind {
                    CodeBlockKind::Fenced(lang) => lang.trim().to_string(),
                    CodeBlockKind::Indented => String::new(),
                };
            }
            Event::End(TagEnd::CodeBlock) => {
                in_code_block = false;

                let code_shading = Shading::new()
                    .shd_type(ShdType::Clear)
                    .fill("F5F7FA")
                    .color("auto");

                let mut p = Paragraph::new()
                    .indent(Some(360), None, None, None)
                    .line_spacing(LineSpacing::new().after(300));

                // Use paragraph-level shading and add soft borders to create a unified text box
                p.property = p.property.shading(code_shading).set_borders(
                    ParagraphBorders::with_empty()
                        .set(ParagraphBorder::new(ParagraphBorderPosition::Top).val(BorderType::Single).color("E8E8E8").size(4).space(4))
                        .set(ParagraphBorder::new(ParagraphBorderPosition::Bottom).val(BorderType::Single).color("E8E8E8").size(4).space(4))
                        .set(ParagraphBorder::new(ParagraphBorderPosition::Left).val(BorderType::Single).color("E8E8E8").size(4).space(4))
                        .set(ParagraphBorder::new(ParagraphBorderPosition::Right).val(BorderType::Single).color("E8E8E8").size(4).space(4))
                );

                // Language label paragraph (e.g. "bash", "json")
                if !code_block_lang.is_empty() {
                    let label_run = Run::new()
                        .add_text(&code_block_lang)
                        .size(16) // 8pt
                        .color("888888")
                        .fonts(RunFonts::new().ascii("Courier New").hi_ansi("Courier New"));
                    p = p.add_run(label_run).add_run(Run::new().add_break(BreakType::TextWrapping));
                }

                // Code block lines
                let mut first_line = true;
                for line in code_block_text.trim_end().lines() {
                    if !first_line {
                        p = p.add_run(Run::new().add_break(BreakType::TextWrapping));
                    }
                    if !line.is_empty() {
                        let run = Run::new()
                            .add_text(line)
                            .fonts(RunFonts::new().ascii("Courier New").hi_ansi("Courier New").east_asia("SimHei"));
                        p = p.add_run(run);
                    }
                    first_line = false;
                }

                // Add a small empty line at the end to visually pad the box
                p = p.add_run(Run::new().add_break(BreakType::TextWrapping));
                docx = docx.add_paragraph(p);

                code_block_text.clear();
                code_block_lang.clear();
            }

            // --- Inline code ---
            Event::Code(text) => {
                let target = if in_table { &mut current_cell_runs } else if heading_level.is_some() { &mut heading_runs } else { &mut current_runs };
                let run = Run::new()
                    .add_text(&*text)
                    .fonts(RunFonts::new().ascii("Courier New").hi_ansi("Courier New"))
                    .shading(
                        Shading::new()
                            .shd_type(ShdType::Clear)
                            .fill("F5F7FA")
                            .color("auto")
                    );
                target.push(run);
            }

            // --- Blockquote ---
            Event::Start(Tag::BlockQuote(_)) => {
                in_blockquote = true;
            }
            Event::End(TagEnd::BlockQuote(_)) => {
                in_blockquote = false;
            }

            // --- Tables ---
            Event::Start(Tag::Table(_)) => {
                in_table = true;
                table_all_rows.clear();
                table_col_count = 0;
            }
            Event::End(TagEnd::Table) => {
                in_table = false;
                if !table_all_rows.is_empty() {
                    let num_cols = table_col_count;
                    let col_width = if num_cols > 0 { 9360 / num_cols } else { 9360 };

                    let header_shading = Shading::new()
                        .shd_type(ShdType::Clear)
                        .fill("F5F7FA")
                        .color("auto");

                    let stripe_shading = Shading::new()
                        .shd_type(ShdType::Clear)
                        .fill("F9F9F9")
                        .color("auto");

                    // If no row is marked as header (no TableHead events emitted),
                    // treat the first row as header by convention.
                    let has_explicit_header = table_all_rows.iter().any(|(h, _)| *h);
                    let mut rows: Vec<TableRow> = Vec::new();

                    for (row_idx, (is_header, row_cells)) in table_all_rows.iter().enumerate() {
                        let treat_as_header = *is_header || (!has_explicit_header && row_idx == 0);
                        let mut cells: Vec<TableCell> = Vec::new();

                        for col_idx in 0..num_cols {
                            let mut p = Paragraph::new();
                            if let Some(cell_runs) = row_cells.get(col_idx) {
                                for run in cell_runs {
                                    let r = if treat_as_header {
                                        run.clone().bold().size(22)
                                    } else {
                                        run.clone()
                                    };
                                    p = p.add_run(r);
                                }
                            }
                            let mut tc = TableCell::new()
                                .add_paragraph(p)
                                .width(col_width, WidthType::Dxa);
                            if treat_as_header {
                                tc = tc.shading(header_shading.clone());
                            } else if row_idx % 2 != 0 {
                                tc = tc.shading(stripe_shading.clone());
                            }
                            cells.push(tc);
                        }
                        rows.push(TableRow::new(cells));
                    }

                    let mut tbl = Table::new(rows);
                    for pos in [
                        TableBorderPosition::Top,
                        TableBorderPosition::Bottom,
                        TableBorderPosition::Left,
                        TableBorderPosition::Right,
                        TableBorderPosition::InsideH,
                        TableBorderPosition::InsideV,
                    ] {
                        tbl = tbl.set_border(
                            TableBorder::new(pos).size(4).border_type(BorderType::Single).color("E8E8E8")
                        );
                    }

                    docx = docx.add_table(tbl);
                    docx = docx.add_paragraph(Paragraph::new());
                }
            }
            Event::Start(Tag::TableHead) => {
                in_table_head = true;
                current_row_cells.clear();
            }
            Event::End(TagEnd::TableHead) => {
                in_table_head = false;
                // Header rows are pushed by TableRow End event, not here
            }
            Event::Start(Tag::TableRow) => {
                current_row_cells.clear();
            }
            Event::End(TagEnd::TableRow) => {
                let n = current_row_cells.len();
                if n > table_col_count { table_col_count = n; }
                table_all_rows.push((in_table_head, current_row_cells.clone()));
                current_row_cells.clear();
            }
            Event::Start(Tag::TableCell) => {
                current_cell_runs.clear();
            }
            Event::End(TagEnd::TableCell) => {
                current_row_cells.push(current_cell_runs.clone());
                current_cell_runs.clear();
            }

            // --- Links ---
            Event::Start(Tag::Link { dest_url: _, .. }) => {
                in_link = true;
            }
            Event::End(TagEnd::Link) => {
                in_link = false;
            }

            // --- Horizontal rule ---
            Event::Rule => {
                let mut p = Paragraph::new();
                p.property = p.property.set_borders(
                    ParagraphBorders::with_empty().set(
                        ParagraphBorder::new(ParagraphBorderPosition::Bottom)
                            .val(BorderType::Single)
                            .size(12)    // 1.5 pt
                            .space(1)
                            .color("E0E0E0")
                    )
                );
                docx = docx.add_paragraph(p);
            }

            // --- Text ---
            Event::Text(text) => {
                if in_code_block {
                    code_block_text.push_str(&text);
                } else if in_table {
                    current_cell_runs.push(build_run(&text, is_bold, is_italic, is_strikethrough, in_blockquote, in_link));
                } else if heading_level.is_some() {
                    heading_runs.push(Run::new().add_text(&*text));
                } else {
                    current_runs.push(build_run(&text, is_bold, is_italic, is_strikethrough, in_blockquote, in_link));
                }
            }

            Event::SoftBreak => {
                if in_code_block {
                    code_block_text.push('\n');
                } else if in_table {
                    current_cell_runs.push(Run::new().add_text(" "));
                } else {
                    current_runs.push(Run::new().add_text(" "));
                }
            }
            Event::HardBreak => {
                if in_code_block {
                    code_block_text.push('\n');
                } else if in_table {
                    current_cell_runs.push(Run::new().add_break(BreakType::TextWrapping));
                } else {
                    current_runs.push(Run::new().add_break(BreakType::TextWrapping));
                }
            }

            _ => {}
        }
    }

    // Flush remaining runs
    if !current_runs.is_empty() {
        let mut p = Paragraph::new();
        for run in current_runs {
            p = p.add_run(run);
        }
        docx = docx.add_paragraph(p);
    }

    // Use unique temp file name to avoid race conditions and symlink attacks
    let tmp_path = std::env::temp_dir().join(format!("md_client_export_{}.docx", std::process::id()));
    let tmp_file = fs::File::create(&tmp_path)
        .map_err(|e| format!("创建临时文件失败: {e}"))?;
    docx.build().pack(tmp_file)
        .map_err(|e| format!("构建 DOCX 失败: {e}"))?;
    fs::copy(&tmp_path, output_path).map_err(|e| {
        if e.raw_os_error() == Some(32) {
            "该文件已在其他程序中打开，请关闭后重试。".to_string()
        } else {
            format!("保存 DOCX 失败: {e}")
        }
    })?;
    fs::remove_file(&tmp_path).ok();
    Ok(())
}
