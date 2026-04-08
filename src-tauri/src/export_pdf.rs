use std::fs;
use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd, HeadingLevel};
use genpdf::elements;
use genpdf::style;
use genpdf::Element as _;

use crate::markdown_preprocess::preprocess_markdown;

fn find_system_font_dir() -> Result<std::path::PathBuf, String> {
    // Try common system font directories
    let candidates = if cfg!(target_os = "windows") {
        vec![
            std::path::PathBuf::from(r"C:\Windows\Fonts"),
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            std::path::PathBuf::from("/Library/Fonts"),
            std::path::PathBuf::from("/System/Library/Fonts"),
        ]
    } else {
        vec![
            std::path::PathBuf::from("/usr/share/fonts/truetype"),
            std::path::PathBuf::from("/usr/share/fonts"),
            std::path::PathBuf::from("/usr/local/share/fonts"),
        ]
    };
    for dir in candidates {
        if dir.exists() {
            return Ok(dir);
        }
    }
    Err("未找到系统字体目录".into())
}

fn load_font_family() -> Result<genpdf::fonts::FontFamily<genpdf::fonts::FontData>, String> {
    let font_dir = find_system_font_dir()?;

    // Try loading fonts in priority order: Microsoft YaHei (CJK), then fallbacks
    let font_specs: Vec<(&str, &str)> = if cfg!(target_os = "windows") {
        vec![
            ("msyh", "Microsoft YaHei"),
            ("arial", "Arial"),
            ("times", "Times New Roman"),
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            ("PingFang", "PingFang SC"),
            ("Arial", "Arial"),
        ]
    } else {
        vec![
            ("DejaVuSans", "DejaVu Sans"),
            ("LiberationSans", "Liberation Sans"),
        ]
    };

    for (file_prefix, _name) in &font_specs {
        match genpdf::fonts::from_files(&font_dir, file_prefix, None) {
            Ok(family) => return Ok(family),
            Err(_) => continue,
        }
    }

    // Last resort: try to load individual .ttf files directly
    // For Windows, msyh.ttc is a TrueType Collection, genpdf expects individual .ttf
    // Try simhei.ttf which is a single .ttf file
    // NOTE: This fallback uses the same font for all variants (regular/bold/italic),
    // so styled text will not be visually distinguishable in the output.
    if cfg!(target_os = "windows") {
        let simhei = font_dir.join("simhei.ttf");
        if simhei.exists() {
            let font_data = genpdf::fonts::FontData::new(
                fs::read(&simhei).map_err(|e| format!("读取字体失败: {e}"))?,
                None,
            ).map_err(|e| format!("解析字体失败: {e}"))?;
            let family = genpdf::fonts::FontFamily {
                regular: font_data.clone(),
                bold: font_data.clone(),
                italic: font_data.clone(),
                bold_italic: font_data,
            };
            return Ok(family);
        }
    }

    Err("未找到合适的字体。请确保已安装系统字体。".into())
}

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
            1 => "- ".to_string(),
            2 => "* ".to_string(),
            _ => "+ ".to_string(),
        }
    }
}

pub fn export_pdf(markdown: &str, output_path: &str) -> Result<(), String> {
    let font_family = load_font_family()?;
    let mut doc = genpdf::Document::new(font_family);
    doc.set_title("Exported Document");
    doc.set_minimal_conformance();

    let mut decorator = genpdf::SimplePageDecorator::new();
    decorator.set_margins(20);
    doc.set_page_decorator(decorator);

    // Set default font size
    doc.set_font_size(11);

    let options = Options::ENABLE_TABLES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS;
    let preprocessed = preprocess_markdown(markdown);
    let parser = Parser::new_ext(&preprocessed, options);

    let mut para_parts: Vec<style::StyledString> = Vec::new();
    let mut is_bold = false;
    let mut is_italic = false;
    let mut in_code_block = false;
    let mut code_block_text = String::new();
    let mut heading_level: Option<HeadingLevel> = None;
    let mut heading_text = String::new();
    let mut in_blockquote = false;
    let mut list_stack: Vec<Option<u64>> = Vec::new(); // None = unordered, Some(n) = ordered starting at n
    let mut item_counter: Vec<u64> = Vec::new();
    let mut in_list_item = false;
    let mut first_block_in_item = false;
    let mut in_table = false;
    let mut table_header: Vec<String> = Vec::new();
    let mut table_rows: Vec<Vec<String>> = Vec::new();
    let mut current_cell_text = String::new();
    let mut current_row: Vec<String> = Vec::new();
    let mut in_table_head = false;

    fn flush_para(parts: &mut Vec<style::StyledString>) -> elements::Paragraph {
        let mut p = elements::Paragraph::new("");
        for part in parts.drain(..) {
            p.push(part);
        }
        p
    }

    fn make_style(bold: bool, italic: bool) -> style::Style {
        let mut s = style::Style::new();
        if bold { s.set_bold(); }
        if italic { s.set_italic(); }
        s
    }

    for event in parser {
        match event {
            // --- Headings ---
            Event::Start(Tag::Heading { level, .. }) => {
                heading_level = Some(level);
                heading_text.clear();
            }
            Event::End(TagEnd::Heading(_)) => {
                if let Some(level) = heading_level {
                    // Note: space_after will stack with paragraph bottom margin (1mm)
                    // So actual spacing = space_after + 1mm
                    let (font_size, space_before, space_after, add_underline) = match level {
                        HeadingLevel::H1 => (22, 2.0, 1.0, false),
                        HeadingLevel::H2 => (18, 1.5, 0.5, true),
                        HeadingLevel::H3 => (16, 1.5, 0.5, false),
                        HeadingLevel::H4 => (14, 1.0, 0.5, false),
                        HeadingLevel::H5 => (12, 1.0, 0.5, false),
                        HeadingLevel::H6 => (11, 1.0, 0.5, false),
                    };

                    // Add space before heading
                    doc.push(elements::Break::new(space_before));

                    let mut s = style::Style::new();
                    s.set_bold();
                    s.set_font_size(font_size);

                    if add_underline {
                        // H2 gets underline using custom element
                        let p = elements::Paragraph::new(
                            style::StyledString::new(heading_text.clone(), s)  
                        );
                        doc.push(p);

                        // Custom element to draw a real vector line
                        struct UnderlineElement;
                        impl genpdf::Element for UnderlineElement {
                            fn render(&mut self, _: &genpdf::Context, area: genpdf::render::Area<'_>, style: style::Style) -> Result<genpdf::RenderResult, genpdf::error::Error> {
                                area.draw_line(vec![genpdf::Position::default(), genpdf::Position::new(area.size().width, 0)], style);
                                Ok(genpdf::RenderResult { size: genpdf::Size::new(area.size().width, genpdf::Mm::from(0.1)), has_more: false })
                            }
                        }

                        let mut line_style = style::Style::new();
                        line_style.set_color(style::Color::Rgb(192, 192, 192));
                        doc.push(elements::Break::new(0.5));
                        doc.push(UnderlineElement.styled(line_style));
                    } else {
                        let p = elements::Paragraph::new(
                            style::StyledString::new(heading_text.clone(), s)  
                        );
                        doc.push(p);
                    }

                    // Add space after heading
                    doc.push(elements::Break::new(space_after));
                }
                heading_level = None;
                heading_text.clear();
            }

            // --- Paragraphs ---
            Event::Start(Tag::Paragraph) => {
                if !in_code_block && !in_table {
                    para_parts.clear();

                    if in_list_item && first_block_in_item {
                        let prefix = list_prefix(&list_stack, &mut item_counter, list_stack.len());
                        para_parts.push(style::StyledString::new(prefix, style::Style::new()));
                        first_block_in_item = false;
                    }
                }
            }
            Event::End(TagEnd::Paragraph) => {
                if !in_code_block && !in_table {
                    let p = flush_para(&mut para_parts);

                    let mut indent_mm = 0;
                    if in_blockquote {
                        indent_mm += 10;
                    }
                    if in_list_item {
                        indent_mm += (list_stack.len() * 5) as u8;
                    }

                    // Reduced bottom margin from 2mm to 1mm for tighter spacing
                    if indent_mm > 0 {
                        let padded = elements::PaddedElement::new(p, genpdf::Margins::trbl(0, 0, 1, indent_mm));
                        doc.push(padded);
                    } else {
                        let padded = elements::PaddedElement::new(p, genpdf::Margins::trbl(0, 0, 1, 0));
                        doc.push(padded);
                    }
                }
            }

            // --- Bold / Italic ---
            Event::Start(Tag::Strong) => { is_bold = true; }
            Event::End(TagEnd::Strong) => { is_bold = false; }
            Event::Start(Tag::Emphasis) => { is_italic = true; }
            Event::End(TagEnd::Emphasis) => { is_italic = false; }

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
                para_parts.clear();
                in_list_item = true;
                first_block_in_item = true;
            }
            Event::End(TagEnd::Item) => {
                in_list_item = false;
                // Flush any remaining inline text that wasn't wrapped in a paragraph
                if !para_parts.is_empty() {
                    let indent_mm = (list_stack.len() * 5) as u8;
                    if first_block_in_item {
                        let prefix = list_prefix(&list_stack, &mut item_counter, list_stack.len());
                        let mut temp_parts = vec![style::StyledString::new(prefix, style::Style::new())];
                        temp_parts.append(&mut para_parts);
                        para_parts = temp_parts;
                        first_block_in_item = false;
                    }

                    let p = flush_para(&mut para_parts);
                    let padded = elements::PaddedElement::new(p, genpdf::Margins::trbl(0, 0, 1, indent_mm));
                    doc.push(padded);
                }
            }

            // --- Code blocks ---
            Event::Start(Tag::CodeBlock(_)) => {
                in_code_block = true;
                code_block_text.clear();
            }
            Event::End(TagEnd::CodeBlock) => {
                in_code_block = false;
                // Render code block as framed, mono-styled text
                let mut code_style = style::Style::new();
                code_style.set_font_size(9);
                code_style.set_color(style::Color::Rgb(33, 37, 41)); // Dark gray/black for contrast
                let mut layout = elements::LinearLayout::vertical();
                for line in code_block_text.trim_end().lines() {
                    let text_line = if line.is_empty() { " " } else { line };  
                    layout.push(elements::Paragraph::new(
                        style::StyledString::new(text_line.to_string(), code_style.clone())
                    ));
                }

                // Add inner padding INSIDE the frame
                let inner_padded = elements::PaddedElement::new(layout, genpdf::Margins::trbl(2, 3, 2, 3));
                let mut frame_style = style::Style::new();
                frame_style.set_color(style::Color::Rgb(230, 230, 230));       
                let framed = elements::FramedElement::new(inner_padded).styled(frame_style);
                // Bottom spacing will stack with next paragraph's margin (1mm), so use 0.5mm here
                let outer_padded = elements::PaddedElement::new(framed, genpdf::Margins::trbl(1, 0, 0.5, 0));
                doc.push(outer_padded);
                code_block_text.clear();
            }

            // --- Inline code ---
            Event::Code(text) => {
                let mut s = style::Style::new();
                s.set_font_size(10);
                // Dark reddish color for code tags, common in many themes     
                s.set_color(style::Color::Rgb(150, 60, 60));
                para_parts.push(style::StyledString::new(format!(" {text} "), s));
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
                table_header.clear();
                table_rows.clear();
            }
            Event::End(TagEnd::Table) => {
                in_table = false;
                // Build table using TableLayout
                if !table_header.is_empty() {
                    let num_cols = table_header.len();
                    let mut table = elements::TableLayout::new(
                        vec![1; num_cols]
                    );
                    table.set_cell_decorator(elements::FrameCellDecorator::new(true, true, false));

                    // Header row
                    let mut header_row = table.row();
                    for cell_text in &table_header {
                        let mut s = style::Style::new();
                        s.set_bold();
                        s.set_font_size(10);
                        header_row.push_element(elements::Paragraph::new(      
                            style::StyledString::new(cell_text.clone(), s)     
                        ));
                    }
                    header_row.push().map_err(|e| format!("表格标题行错误: {e}"))?;

                    // Data rows
                    for row_data in &table_rows {
                        let mut data_row = table.row();
                        for (i, cell_text) in row_data.iter().enumerate() {    
                            if i < num_cols {
                                let s = style::Style::new();
                                data_row.push_element(elements::Paragraph::new(
                                    style::StyledString::new(cell_text.clone(), s)
                                ));
                            }
                        }
                        // Pad remaining columns if row is short
                        for _ in row_data.len()..num_cols {
                            data_row.push_element(elements::Paragraph::new(""));
                        }
                        data_row.push().map_err(|e| format!("表格数据行错误: {e}"))?;
                    }

                    // Small spacing before table, none after (next paragraph provides spacing)
                    doc.push(elements::Break::new(0.5));
                    doc.push(table);
                }
                table_header.clear();
                table_rows.clear();
            }
            Event::Start(Tag::TableHead) => {
                in_table_head = true;
            }
            Event::End(TagEnd::TableHead) => {
                in_table_head = false;
            }
            Event::Start(Tag::TableRow) => {
                current_row.clear();
            }
            Event::End(TagEnd::TableRow) => {
                if in_table_head {
                    table_header = current_row.clone();
                } else {
                    table_rows.push(current_row.clone());
                }
                current_row.clear();
            }
            Event::Start(Tag::TableCell) => {
                current_cell_text.clear();
            }
            Event::End(TagEnd::TableCell) => {
                current_row.push(current_cell_text.clone());
                current_cell_text.clear();
            }

            // --- Horizontal rule ---
            Event::Rule => {
                // Reuse UnderlineElement for consistent vector line rendering
                struct UnderlineElement;
                impl genpdf::Element for UnderlineElement {
                    fn render(&mut self, _: &genpdf::Context, area: genpdf::render::Area<'_>, style: style::Style) -> Result<genpdf::RenderResult, genpdf::error::Error> {
                        area.draw_line(vec![genpdf::Position::default(), genpdf::Position::new(area.size().width, 0)], style);
                        Ok(genpdf::RenderResult { size: genpdf::Size::new(area.size().width, genpdf::Mm::from(0.1)), has_more: false })
                    }
                }

                // Small spacing before rule, none after (next paragraph provides spacing)
                doc.push(elements::Break::new(0.5));
                let mut rule_style = style::Style::new();
                rule_style.set_color(style::Color::Rgb(192, 192, 192));
                doc.push(UnderlineElement.styled(rule_style));
            }

            // --- Task lists ---
            Event::TaskListMarker(checked) => {
                let symbol = if checked { "[x] " } else { "[ ] " };
                para_parts.push(style::StyledString::new(symbol.to_string(), style::Style::new()));
            }

            // --- Text content ---
            Event::Text(text) => {
                if in_code_block {
                    code_block_text.push_str(&text);
                } else if heading_level.is_some() {
                    heading_text.push_str(&text);
                } else if in_table {
                    current_cell_text.push_str(&text);
                } else {
                    para_parts.push(style::StyledString::new(
                        text.to_string(),
                        make_style(is_bold, is_italic),
                    ));
                }
            }

            Event::SoftBreak => {
                if in_code_block {
                    code_block_text.push('\n');
                } else if !in_table {
                    para_parts.push(style::StyledString::new(
                        " ".to_string(),
                        style::Style::new(),
                    ));
                }
            }
            Event::HardBreak => {
                if in_code_block {
                    code_block_text.push('\n');
                } else if !in_table {
                    // Flush current paragraph and start new one
                    if !para_parts.is_empty() {
                        doc.push(flush_para(&mut para_parts));
                    }
                }
            }

            // --- Links ---
            Event::Start(Tag::Link { dest_url: _, .. }) => {
                para_parts.push(style::StyledString::new(
                    "[".to_string(),
                    style::Style::new(),
                ));
            }
            Event::End(TagEnd::Link) => {
                para_parts.push(style::StyledString::new(
                    "]".to_string(),
                    style::Style::new(),
                ));
            }

            _ => {}
        }
    }

    // Flush any remaining text
    if !para_parts.is_empty() {
        doc.push(flush_para(&mut para_parts));
    }

    // Use unique temp file name to avoid race conditions and symlink attacks
    let tmp_path = std::env::temp_dir().join(format!("md_client_export_{}.pdf", std::process::id()));
    doc.render_to_file(&tmp_path)
        .map_err(|e| format!("PDF 渲染失败: {e}"))?;
    fs::copy(&tmp_path, output_path)
        .map_err(|e| format!("保存 PDF 失败: {e}"))?;
    fs::remove_file(&tmp_path).ok();
    Ok(())
}
