# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-04-08

### Added

- **PDF Export**: Full-featured PDF generation with proper typography
  - Support for all markdown elements (headings, tables, code blocks, lists, blockquotes)
  - Configurable heading spacing with visual hierarchy
  - H2 headings with underline decoration
  - Emoji rendering support
  - Syntax-highlighted code blocks with frames
  - GFM table support with borders
- **DOCX Export**: Complete Word document generation
  - Full markdown element support including tables and code blocks
  - Professional styling and formatting
  - Striped table rows for better readability
  - Code block highlighting with backgrounds
  - Proper list formatting with multiple levels
- Export buttons in toolbar UI
- Empty document validation before export
- User-friendly error messages in Chinese

### Changed

- Refactored export code into modular structure (lib.rs reduced from 1132 to 58 lines)
- Optimized PDF spacing to account for element stacking (50% reduction in margins)
- Improved paragraph and heading spacing for better readability

### Fixed

- Security: Use process ID for unique temp file names (prevents race conditions and symlink attacks)
- Consolidated duplicate list-prefix logic across PDF and DOCX exporters
- Fixed heading spacing in PDF to match DOCX visual style

### Technical

- Dependencies added: `pulldown-cmark` (0.12), `docx-rs` (0.4), `genpdf` (0.2), `emojis` (0.8)
- Binary size: 11MB → 14MB (+27%, includes image processing and font rendering libraries)
- New modules: `export_pdf.rs`, `export_docx.rs`, `markdown_preprocess.rs`

## [0.1.0] - 2026-04-07

### Added

- Multi-tab Markdown editing with CodeMirror 6
- Live split-view preview with react-markdown
- GFM support (tables, task lists, strikethrough)
- Syntax-highlighted code blocks via highlight.js
- File open/save/save-as via Tauri dialog
- Drag-and-drop file opening
- Synchronized scroll between editor and preview
- Keyboard shortcuts (Ctrl+S, Ctrl+O, Ctrl+W, Ctrl+N)
- Tab context menu (close, close others, close all)
- Cursor position display in status bar
- One Dark editor theme
- Collapsible details blocks via remark-directive
