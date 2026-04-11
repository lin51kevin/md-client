use std::fs;
use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd, HeadingLevel, CodeBlockKind};
use genpdf::elements;
use genpdf::style;
use genpdf::Element as _;
use image::GenericImageView as _;

use crate::markdown_preprocess::preprocess_markdown;

/// [P0-2] Try to load an image for PDF embedding.
/// Checks the pre-rendered images map first, then tries local file system.
fn load_image_for_pdf(
    url: &str,
    images: &std::collections::HashMap<String, (Vec<u8>, u32, u32)>,
) -> Option<(elements::Image, f64)> {
    // 1. Try pre-rendered images map (e.g., mermaid_0, latex_0)
    if let Some((png_bytes, w_px, h_px)) = images.get(url) {
        return decode_png_for_pdf(png_bytes, *w_px, *h_px);
    }

    // 2. Try as local file path (relative or absolute)
    let path = std::path::Path::new(url);
    if path.exists() && path.is_file() {
        if let Ok(raw_bytes) = fs::read(path) {
            // Try to decode to get dimensions
            if let Ok(raw_img) = image::load_from_memory(&raw_bytes) {
                let (w, h) = raw_img.dimensions();
                return decode_png_for_pdf(&raw_bytes, w, h);
            }
        }
    }

    None
}

/// Decode PNG bytes into a genpdf Image element with appropriate DPI scaling.
fn decode_png_for_pdf(png_bytes: &[u8], w_px: u32, _h_px: u32) -> Option<(elements::Image, f64)> {
    match image::load_from_memory(png_bytes) {
        Ok(raw_img) => {
            let dpi = (25.4 * w_px as f64 / 170.0).max(72.0);
            let rgb = image::DynamicImage::ImageRgb8(raw_img.to_rgb8());
            match elements::Image::from_dynamic_image(rgb) {
                Ok(img_el) => Some((img_el, dpi)),
                Err(_) => None,
            }
        }
        Err(_) => None,
    }
}

/// Sanitize text for PDF rendering.
/// System CJK fonts (SimHei, Microsoft YaHei) lack emoji glyphs and genpdf
/// does not support font fallback.  Strip characters that would render as
/// blank boxes rather than corrupting the output.
fn sanitize_text_for_pdf(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        if !is_non_renderable_for_pdf(c as u32) {
            out.push(c);
        }
    }
    out
}

/// Returns `true` for codepoints that CJK system fonts cannot render.
fn is_non_renderable_for_pdf(cp: u32) -> bool {
    matches!(cp,
        0xFE00..=0xFE0F   | // Variation selectors
        0x200D            | // Zero Width Joiner (emoji sequences)
        0x20E3            | // Combining Enclosing Keycap
        0x1F300..=0x1F9FF | // Misc Symbols/Pictographs, Emoticons, Transport, etc.
        0x1FA00..=0x1FAFF | // Symbols Extended-A
        0x1F000..=0x1F0FF | // Mahjong / Dominos
        0x2600..=0x26FF   | // Misc Symbols (☀☁☂★☎♠♣ etc.)
        0x2700..=0x27BF   | // Dingbats (✂✈✉✌ etc.)
        0x2300..=0x23FF   | // Misc Technical (⌨⌚ etc.)
        0x2B50..=0x2B55   | // Stars, circles
        0xE0020..=0xE007F   // Tag sequences (flag emoji)
    )
}

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
        // Linux: prioritize CJK fonts, then fallback to Latin fonts and emoji
        vec![
            // [P0-1] CJK font candidates for Chinese/Japanese/Korean rendering
            ("NotoSansCJK", "Noto Sans CJK SC"),
            ("NotoSerifCJK", "Noto Serif CJK SC"),
            ("WenQuanYiMicroHei", "WenQuanYi Micro Hei"),
            ("SourceHanSansSC", "Source Han Sans SC"),
            ("simhei", "SimHei"),
            // [FIX P0-5 Bug 5] Emoji font for emoji rendering
            ("NotoEmoji", "Noto Emoji"),
            ("SegoiuEmoji", "Segoe UI Emoji"),  // Some Linux systems have this
            // Fallback to Latin fonts if no CJK available
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

/// Custom page decorator that applies margins and renders page numbers at bottom center.
/// genpdf calls decorate_page before rendering each page, so total_pages is unknown.
/// We track the current page number internally (increment on each call).
struct NumberedPageDecorator {
    margins: u32,
    page_num: u32,
}

impl NumberedPageDecorator {
    fn new(margins: u32) -> Self {
        Self { margins, page_num: 0 }
    }
}

impl genpdf::PageDecorator for NumberedPageDecorator {
    fn decorate_page<'a>(
        &mut self,
        context: &genpdf::Context,
        mut area: genpdf::render::Area<'a>,
        style: genpdf::style::Style,
    ) -> Result<genpdf::render::Area<'a>, genpdf::error::Error> {
        self.page_num += 1;

        // Apply margins (same as SimplePageDecorator::set_margins)
        area.add_margins((
            genpdf::Mm::from(self.margins),
            genpdf::Mm::from(self.margins),
            genpdf::Mm::from(self.margins),
            genpdf::Mm::from(self.margins),
        ));

        // Reserve 10mm at bottom for footer, return shrunk content area
        let footer_height = genpdf::Mm::from(10.0_f32);
        let mut content_area = area.clone();
        content_area.add_margins((
            genpdf::Mm::default(),
            genpdf::Mm::default(),
            footer_height,
            genpdf::Mm::default(),
        ));

        // Draw page number text centered in footer area
        let footer_text = format!("— {} —", self.page_num);
        let mut footer_style = style;
        footer_style.set_font_size(9);
        footer_style.set_color(genpdf::style::Color::Rgb(128, 128, 128));
        let _ = area.print_str(
            &context.font_cache,
            genpdf::Position::new(
                (area.size().width - genpdf::Mm::from(20.0_f32)) / 2.0,
                area.size().height - genpdf::Mm::from(6.0_f32),
            ),
            footer_style,
            &footer_text,
        );

        Ok(content_area)
    }
}

pub fn export_pdf(
    markdown: &str,
    output_path: &str,
    images: &std::collections::HashMap<String, (Vec<u8>, u32, u32)>,
) -> Result<(), String> {
    let font_family = load_font_family()?;
    let mut doc = genpdf::Document::new(font_family);
    doc.set_title("Exported Document");
    doc.set_minimal_conformance();

    // Custom page decorator: margins + footer page number
    doc.set_page_decorator(NumberedPageDecorator::new(20));

    // Set default font size
    doc.set_font_size(11);

    let options = Options::ENABLE_TABLES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS
        | Options::ENABLE_MATH;
    let preprocessed = preprocess_markdown(markdown);

    let parser = Parser::new_ext(&preprocessed, options);

    let mut para_parts: Vec<style::StyledString> = Vec::new();
    let mut is_bold = false;
    let mut is_italic = false;
    let mut is_strikethrough = false; // [P1-3]
    let mut in_code_block = false;
    let mut code_block_text = String::new();
    let mut code_block_lang = String::new();
    let mut mermaid_counter = 0usize;
    let mut latex_counter = 0usize; // [P0-5] LaTeX pre-rendered image index
    let mut heading_level: Option<HeadingLevel> = None;
    let mut heading_text = String::new();
    let mut in_blockquote = false;
    let mut list_stack: Vec<Option<u64>> = Vec::new(); // None = unordered, Some(n) = ordered starting at n
    let mut item_counter: Vec<u64> = Vec::new();
    let mut in_list_item = false;
    let mut first_block_in_item = false;
    let mut in_table = false;
    let mut current_link_url: Option<String> = None; // [P1-2]
    let mut table_header: Vec<String> = Vec::new();
    let mut table_rows: Vec<Vec<String>> = Vec::new();
    let mut current_cell_text = String::new();
    let mut current_row: Vec<String> = Vec::new();


    fn flush_para(parts: &mut Vec<style::StyledString>) -> elements::Paragraph {
        let mut p = elements::Paragraph::new("");
        for part in parts.drain(..) {
            p.push(part);
        }
        p
    }

    fn make_style(bold: bool, italic: bool, _strikethrough: bool) -> style::Style {
        let mut s = style::Style::new();
        if bold { s.set_bold(); }
        if italic { s.set_italic(); }
        // Note: set_strikethrough() not available in genpdf 0.2
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
            // [P1-3] Strikethrough
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

                // --- Mermaid diagrams: embed pre-rendered PNG if available ---
                if code_block_lang == "mermaid" {
                    let key = format!("mermaid_{}", mermaid_counter);
                    mermaid_counter += 1;
                    if let Some((png_bytes, _, _)) = images.get(&key) {
                        match image::load_from_memory(png_bytes) {
                            Ok(raw_img) => {
                                let (px_w, _) = raw_img.dimensions();
                                // Compute DPI so image fits within 170mm content width
                                let dpi = (25.4 * px_w as f64 / 170.0).max(72.0);
                                // Convert RGBA→RGB (genpdf doesn't support alpha)
                                let rgb = image::DynamicImage::ImageRgb8(raw_img.to_rgb8());
                                match elements::Image::from_dynamic_image(rgb) {
                                    Ok(img_el) => {
                                        doc.push(elements::Break::new(1.0));
                                        doc.push(img_el.with_dpi(dpi));
                                        doc.push(elements::Break::new(1.0));
                                        code_block_text.clear();
                                        code_block_lang.clear();
                                        continue;
                                    }
                                    Err(_) => {} // fall through to code-block fallback
                                }
                            }
                            Err(_) => {} // fall through to code-block fallback
                        }
                    }
                }

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
                code_block_lang.clear();
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
                    // [P2-3] Compute proportional column widths based on content length
                    let mut col_widths: Vec<u32> = vec![1; num_cols];
                    // Measure header widths
                    for (i, cell) in table_header.iter().enumerate() {
                        if i < num_cols { col_widths[i] = (cell.chars().count() as u32).max(1); }
                    }
                    // Measure data row widths
                    for row in &table_rows {
                        for (i, cell) in row.iter().enumerate() {
                            if i < num_cols { col_widths[i] = col_widths[i].max(cell.chars().count() as u32); }
                        }
                    }
                    // Normalize to proportions summing roughly to 100
                    let total: u32 = col_widths.iter().sum();
                    let prop_widths: Vec<usize> = col_widths.iter()
                        .map(|w| if total > 0 { ((*w as f64 / total as f64) * 100.0).round() as usize } else { 100 / num_cols })
                        .collect();
                    
                    let mut table = elements::TableLayout::new(prop_widths);
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
                current_row.clear(); // 开始新的表头行
            }
            Event::End(TagEnd::TableHead) => {
                // TableHead 内部没有 TableRow 事件，表头单元格直接在 TableHead 下
                // 所以在 TableHead 结束时保存表头
                table_header = current_row.clone();
                current_row.clear();
            }
            Event::Start(Tag::TableRow) => {
                current_row.clear();
            }
            Event::End(TagEnd::TableRow) => {
                // 只有数据行才有 TableRow 事件
                table_rows.push(current_row.clone());
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

            // --- Images [P0-2] ---
            Event::Start(Tag::Image { dest_url, .. }) => {
                // Try to load and embed the image
                let img_result = load_image_for_pdf(dest_url.as_ref(), images);
                if let Some((img_el, _dpi)) = img_result {
                    doc.push(elements::Break::new(1.0));
                    doc.push(img_el);
                    doc.push(elements::Break::new(1.0));
                }
                // If image loading fails, silently skip (alt text was already collected as Text events)
            }

            // --- Math (requires ENABLE_MATH option) [P0-5] ---
            Event::InlineMath(formula) => {
                // [FIX P0-5 Bug 3] Try pre-rendered image first
                let key = format!("latex_{}", latex_counter);
                latex_counter += 1;
                
                // Try to use pre-rendered image as background/image if available
                // genpdf doesn't support inline images in paragraphs well, so we
                // use styled text fallback (blue italic) which is the best we can do
                if let Some((png_bytes, w_px, h_px)) = images.get(&key) {
                    if let Some((img_el, dpi)) = decode_png_for_pdf(png_bytes, *w_px, *h_px) {
                        // Flush current text
                        if !para_parts.is_empty() {
                            let p = flush_para(&mut para_parts);
                            let padded = elements::PaddedElement::new(p, genpdf::Margins::trbl(0, 0, 1, 0));
                            doc.push(padded);
                        }
                        // Add inline math as small image
                        doc.push(elements::Break::new(0.5));
                        doc.push(img_el.with_dpi(dpi));
                        doc.push(elements::Break::new(0.5));
                    } else {
                        // Fallback to styled text
                        let mut s = style::Style::new();
                        s.set_font_size(10);
                        s.set_italic();
                        s.set_color(style::Color::Rgb(70, 90, 180));
                        para_parts.push(style::StyledString::new(formula.to_string(), s));
                    }
                } else {
                    // Fallback: styled text (no pre-rendered image available)
                    let mut s = style::Style::new();
                    s.set_font_size(10);
                    s.set_italic();
                    s.set_color(style::Color::Rgb(70, 90, 180));
                    para_parts.push(style::StyledString::new(formula.to_string(), s));
                }
            }
            Event::DisplayMath(formula) => {
                // [P0-5] Try pre-rendered image first
                let key = format!("latex_{}", latex_counter);
                latex_counter += 1;
                let mut rendered = false;
                if let Some((png_bytes, w_px, h_px)) = images.get(&key) {
                    if let Some((img_el, dpi)) = decode_png_for_pdf(png_bytes, *w_px, *h_px) {
                        if !para_parts.is_empty() {
                            let p = flush_para(&mut para_parts);
                            let padded = elements::PaddedElement::new(p, genpdf::Margins::trbl(0, 0, 1, 0));
                            doc.push(padded);
                        }
                        doc.push(elements::Break::new(1.0));
                        doc.push(img_el.with_dpi(dpi));
                        doc.push(elements::Break::new(1.0));
                        rendered = true;
                    }
                }
                if !rendered {
                // Fallback: render display math as framed styled block (LaTeX source)
                if !para_parts.is_empty() {
                    let p = flush_para(&mut para_parts);
                    let padded = elements::PaddedElement::new(p, genpdf::Margins::trbl(0, 0, 1, 0));
                    doc.push(padded);
                }
                let mut math_style = style::Style::new();
                math_style.set_font_size(10);
                math_style.set_italic();
                math_style.set_color(style::Color::Rgb(70, 90, 180));
                let mut layout = elements::LinearLayout::vertical();
                for line in formula.lines() {
                    let text_line = if line.trim().is_empty() { " " } else { line };
                    layout.push(elements::Paragraph::new(
                        style::StyledString::new(text_line.to_string(), math_style.clone())
                    ));
                }
                let inner = elements::PaddedElement::new(layout, genpdf::Margins::trbl(2, 3, 2, 3));
                let mut frame_style = style::Style::new();
                frame_style.set_color(style::Color::Rgb(180, 200, 240));
                let framed = elements::FramedElement::new(inner).styled(frame_style);
                doc.push(elements::PaddedElement::new(framed, genpdf::Margins::trbl(1, 0, 1, 0)));
                } // end !rendered
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
                    heading_text.push_str(&sanitize_text_for_pdf(&text));
                } else if in_table {
                    current_cell_text.push_str(&sanitize_text_for_pdf(&text));
                } else {
                    para_parts.push(style::StyledString::new(
                        sanitize_text_for_pdf(&text),
                        make_style(is_bold, is_italic, is_strikethrough),
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
            Event::Start(Tag::Link { dest_url, .. }) => {
                // [P1-2] Capture URL for display
                current_link_url = Some(dest_url.to_string());
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
                // [P1-2] Append URL in small text after the link
                if let Some(url) = current_link_url.take() {
                    let mut url_style = style::Style::new();
                    url_style.set_font_size(8);
                    url_style.set_color(style::Color::Rgb(100, 100, 150));
                    para_parts.push(style::StyledString::new(format!(" ({url})"), url_style));
                }
            }

            _ => {}
        }
    }

    // Flush any remaining text
    if !para_parts.is_empty() {
        doc.push(flush_para(&mut para_parts));
    }

    // Use unique temp file name to avoid race conditions and symlink attacks
    let tmp_path = std::env::temp_dir().join(format!("md_client_export_{}_{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis()));
    doc.render_to_file(&tmp_path)
        .map_err(|e| format!("PDF 渲染失败: {e}"))?;
    fs::copy(&tmp_path, output_path)
        .map_err(|e| format!("保存 PDF 失败: {e}"))?;
    fs::remove_file(&tmp_path).ok();
    Ok(())
}
