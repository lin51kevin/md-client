# MarkLite 架构文档

## 概述

**版本**：v0.9.0（当前版本）| **最后更新**：2026-04-15

MarkLite 是一个基于 Tauri 2 + React 19 的桌面 Markdown 编辑器，采用前后端分离架构：
- **前端（WebView）**：React 19 + TypeScript + Vite 6 + Tailwind CSS 4
- **后端（Rust）**：Tauri 2 原生模块，处理文件 I/O、导出、目录遍历等

---

## 前端组件层级图

```
App
├── TitleBar                          # 窗口标题栏（原生/自定义）
├── MainLayout
│   ├── FileTreeSidebar               # F014 — 文件树侧边栏
│   │   └── TreeNodeView (recursive)  # 树节点（递归渲染）
│   ├── EditorPane                    # 编辑器区域
│   │   ├── TabBar                    # 标签页栏
│   │   │   └── TabItem × N           # 单个标签页
│   │   └── EditorPanel               # 编辑器面板（分屏）
│   │       ├── CodeMirrorEditor      # F006 — CodeMirror 6 编辑器实例
│   │       ├── MarkdownPreview       # F007/F008 — Markdown 预览
│   │       │   ├── MermaidBlock      # Mermaid 图表渲染
│   │       │   ├── LocalImage        # 本地图片加载（base64）
│   │       │   ├── FrontmatterPanel  # Frontmatter 元数据面板
│   │       │   └── TableEditor       # 表格内联编辑器
│   │       └── SplitPane             # react-split 分屏组件
│   └── StatusBar                     # 底部状态栏
└── GlobalDialogs                     # 全局对话框（导出设置、搜索替换等）
```

### 关键前端组件职责

| 组件 | 文件 | 职责 |
|------|------|------|
| `FileTreeSidebar` | `components/FileTreeSidebar.tsx` | 目录树展示、懒加载、CRUD（新建/删除/重命名）、搜索过滤、展开状态持久化 |
| `CodeMirrorEditor` | `components/CodeMirrorEditor.tsx` | CM6 编辑器实例管理、语言模式切换、VIM 键绑定、自动补全、实时字数统计 |
| `MarkdownPreview` | `components/MarkdownPreview.tsx` | ReactMarkdown 渲染管线（GFM + Math + Mermaid + WikiLinks）+ KaTeX 公式渲染 |
| `TabBar` | `components/TabBar.tsx` | 多标签页管理（打开/关闭/切换/拖拽排序） |
| `TableEditor` | `components/TableEditor.tsx` | 可视化表格编辑（增删行列、单元格编辑） |
| `Toolbar` | `components/Toolbar.tsx` | 工具栏：文件操作、格式化按钮、切换按钮、视图模式切换、标签导航；键盘方向键导航 |
| `ToolbarButton` | `components/ToolbarButton.tsx` | 工具栏通用按钮，封装 action / toggle / view 三种变体样式 |
| `TableSizePicker` | `components/TableSizePicker.tsx` | 表格尺寸网格选择器（8×8 弹出层）

### 核心 Hook / State 管理

- **Tab 状态**：`useTabs` hook → 管理 `Tab[]` 数组（路径、内容、修改状态、光标位置）
- **全局状态**：通过 props drilling + callback 模式传递（非 Redux/Zustand）
- **持久化**：
  - `localStorage`：文件树根路径、展开状态、主题偏好、编辑器配置
  - Tauri FS API：文件读写、自动保存

---

## 后端 Rust 导出流水线

```
src-tauri/src/
├── main.rs                 # 入口，调用 lib::run()
├── lib.rs                  # Tauri 应用构建、命令注册、路径验证
├── markdown_preprocess.rs  # Markdown 预处理（占位符替换）
├── export_pdf.rs           # PDF 导出（genpdf + pre-rendered images）
└── export_docx.rs          # DOCX 导出（docx-rs + pre-rendered images）
```

### Rust 命令注册（lib.rs）

| 命令 | 功能 |
|------|------|
| `greet` | 测试用问候 |
| `get_open_file` | 获取命令行传入的文件路径 |
| `export_document` | 统一导出入口（PDF/DOCX），接收 base64 预渲染图片 |
| `read_file_text` | 读取文本文件 |
| `read_file_bytes` | 读取二进制文件（图片等） |
| `write_file_text` | 写入文本文件 |
| `write_image_bytes` | 写入二进制数据 |
| `create_file` | 新建文件 |
| `delete_file` | 删除文件/空目录 |
| `rename_file` | 重命名文件 |
| `list_directory` | 列出单层目录 |
| `read_dir_recursive` | 递归列出目录（指定深度） |
| `search_files` | 跨文件正则/纯文本搜索 |
| `replace_in_files` | 跨文件搜索替换 |

### 导出流水线详细流程

```
用户点击导出
    ↓
前端 prerenderExportAssets()          ← src/lib/export-prerender.ts
    ├─ 提取 ```mermaid``` 块 → mermaid.render() → SVG → html2canvas → PNG base64
    ├─ 提取 $$...$$ / $...$ 公式 → KaTeX.renderToString() → SVG+foreignObject → Canvas → PNG base64
    └─ 返回 PreRenderedAssets { "mermaid_0": {data, w, h}, "latex_0": {...}, ... }
    ↓
前端 invoke('export_document', { markdown, output_path, format, pre_rendered_images })
    ↓ [Tauri IPC]
后端 export_document()                ← src-tauri/src/lib.rs
    ├─ validate_user_path()            // 安全校验（防目录穿越、系统目录拦截）
    ├─ base64 解码 PNG 字节
    ├─ 大小检查（单图 ≤50MB, 总计 ≤200MB）
    ↓
    ├─ format == "pdf" → export_pdf()     ← export_pdf.rs
    │   └─ markdown_preprocess()           ← markdown_preprocess.rs
    │       └─ 将 {{mermaid_0}} 等占位符替换为 ![](base64...)
    │   └─ genpdf 渲染 PDF
    │
    └─ format == "docx" → export_docx()   ← export_docx.rs
        └─ markdown_preprocess()
        └─ docx-rs 生成 .docx
```

---

## 关键数据流

### 完整数据流：用户输入 → 文件

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户交互流程                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  用户键盘输入                                                        │
│      │                                                              │
│      ▼                                                              │
│  CodeMirror 6 Editor (视图层)                                       │
│      │  • 输入事件 → Document.update()                              │
│      │  • 语法高亮 (@codemirror/lang-markdown)                      │
│      │  • 自动补全 (@codemirror/autocomplete)                       │
│      │  • VIM 模式 (@replit/codemirror-vim)                        │
│      │                                                              │
│      ▼                                                              │
│  useTabs Hook (状态管理层)                                          │
│      │  • tabs[id].content = editor.getContent()                   │
│      │  • tabs[id].dirty = true                                    │
│      │  • 触发自动保存定时器 (debounce 500ms)                       │
│      │                                                              │
│      ▼                                                              │
│  自动保存 (Tauri invoke)                                            │
│      │  • invoke('write_file_text', { path, content })              │
│      │  • 或用户手动 Ctrl+S                                         │
│      ▼                                                              │
│  ─────────────── IPC boundary (Tauri async command) ──────────────  │
│      │                                                              │
│      ▼                                                              │
│  Rust 后端 write_file_text()                                        │
│      │  • validate_user_path()                                      │
│      │  • std::fs::create_dir_all() + std::fs::write()             │
│      ▼                                                              │
│  文件系统 (磁盘)                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 导出数据流

```
┌─────────────────────────────────────────────────────────────────────┐
│                         导出流程                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  当前标签页 content (Markdown 源码)                                  │
│      │                                                              │
│      ├──────────────────┐                                           │
│      ▼                  ▼                                           │
│  HTML 导出          PDF/DOCX 导出                                   │
│  (纯前端)           (前端预渲染 + 后端合成)                           │
│      │                  │                                           │
│      ▼                  ▼                                           │
│  parseMarkdownToHtml  prerenderExportAssets()                        │
│  • 正则解析 MD→HTML   • Mermaid → PNG                               │
│  • KaTeX 渲染公式     • LaTeX → PNG                                 │
│  • DOMPurify 清洗     • html2canvas 截图                            │
│  • 内嵌 CSS           • 返回 base64 assets map                      │
│      │                  │                                           │
│      ▼                  ▼                                           │
│  buildHtmlDocument    invoke('export_document')                     │
│  • DOCTYPE + <html>   • {markdown, format, path, pre_rendered_images}
│  • 内联 KaTeX CSS     │                                              │
│  • 内联 Highlight.CSS │                                              │
│  • Theme CSS          ▼                                              │
│      │              Rust export_document()                          │
│      ▼              • validate + decode base64                      │
│  下载 HTML 文件     • markdown_preprocess() — 占位符替换             │
│                   • export_pdf() / export_docx()                    │
│                   ▼                                                 │
│                   写入 .pdf / .docx 文件                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 文件树数据流

```
FileTreeSidebar
    │
    ├─ init: localStorage 读取 'marklite-filetree-root'
    │   └─ invoke('read_dir_recursive', {path, depth: 2})
    │   └─ buildTreeNode(entry, expandedSet) ← 从 'marklite-filetree-expanded' 恢复展开状态
    │
    ├─ 点击文件夹:
    │   ├─ toggleDir(path) → 更新 node.expanded
    │   └─ requestAnimationFrame → 收集展开路径 → localStorage.setItem('marklite-filetree-expanded')
    │   └─ loadChildren(path) → invoke('list_directory')
    │
    ├─ 右键文件:
    │   ├─ 重命名 → invoke('rename_file') → loadRoot()
    │   └─ 删除 → invoke('delete_file') → loadRoot()
    │
    └─ 点击文件 → onFileOpen(path) → useTabs.addTab(path)
```

---

## 前端核心库依赖

| 类别 | 库 | 用途 |
|------|-----|------|
| 编辑器 | CodeMirror 6 (`@uiw/react-codemirror`) | Markdown 实时编辑 |
| Markdown 解析 | react-markdown + remark-gfm/rehype-katex | 预览渲染 |
| 数学公式 | KaTeX 0.16 | LaTeX → HTML/SVG |
| 图表 | Mermaid 11 | 流程图/时序图等 |
| 截图 | html2canvas | DOM → PNG（导出用） |
| 安全 | DOMPurify 3 | XSS 防护 |
| YAML | js-yaml 4 | Frontmatter 复杂解析后备 |
| UI | lucide-react | 图标库 |
| 布局 | react-split | 分屏拖拽 |

## 技术决策记录

1. **为什么用 CodeMirror 6 而不是 Monaco**：更轻量、更易定制、更好的 Markdown 语言支持
2. **为什么导出需要预渲染**：Rust 生态没有可靠的 Mermaid/KaTeX 渲染器，必须在 WebView 中完成
3. **为什么用 base64 传递图片**：Tauri IPC 不支持直接传递 ArrayBuffer/Blob，base64 是最兼容的方式
4. **为什么 frontmatter 有两套解析器**：内置轻量解析器覆盖 90% 场景且零额外依赖；js-yaml 作为后备覆盖复杂嵌套 YAML
5. **文件树展开状态持久化**：使用 localStorage 存储展开路径集合，初始化时恢复，避免每次刷新都折叠

---

## 插件系统

### 架构概览

```
┌──────────────────────────────────────────────────┐
│                  MarkLite App                     │
├──────────┬───────────┬───────────┬───────────────┤
│ PluginPanel UI      │    Plugin Host Runtime    │
│ (PluginPanel.tsx)   │                           │
├──────────┴───────────┼───────────┴───────────────┤
│                     │                           │
│  ┌───────────────┐  │  ┌──────────────────────┐ │
│  │ Plugin Loader │──▶│  │  Plugin Lifecycle   │ │
│  │ (loader)      │  │  │  (activate/deactivate)│ │
│  └───────┬───────┘  │  └──────────┬───────────┘ │
│          │          │             │             │
│  ┌───────▼───────┐  │  ┌──────────▼───────────┐ │
│  │ Plugin        │  │  │  Plugin Context      │ │
│  │ Registry      │  │  │  (commands/workspace/│ │
│  │ (registry)    │  │  │   editor/sidebar/    │ │
│  └───────────────┘  │  │   storage)           │ │
│                     │  └──────────────────────┘ │
│  ┌───────────────┐  │  ┌──────────────────────┐ │
│  │ Permission    │  │  │  Plugin API Types    │ │
│  │ Checker       │  │  │  (plugin-api.ts)     │ │
│  └───────────────┘  │  └──────────────────────┘ │
└─────────────────────┴───────────────────────────┘
         │                         │
    ┌────▼────┐              ┌─────▼──────┐
    │ Official│              │  Community │
    │ Plugins │              │  Plugins   │
    │ (3个)   │              │  (可扩展)   │
    └─────────┘              └────────────┘
```

### 开发阶段完成状态

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 1 | Plugin API 类型定义 | ✅ 完成 |
| Phase 2 | 插件加载器 + 生命周期管理 | ✅ 完成 |
| Phase 3 | 权限系统 (声明式 + 运行时检查) | ✅ 完成 |
| Phase 4 | 官方插件 (Backlinks / Graph View / Snippet Manager) | ✅ 完成 |
| Phase 5 | 插件面板 UI + 脚手架 + 开发文档 | ✅ 完成 |

### 核心文件索引

| 文件 | 职责 |
|------|------|
| `src/plugins/plugin-api.ts` | PluginContext / Plugin 接口类型定义 |
| `src/plugins/plugin-loader.ts` | 插件发现、加载、错误处理 |
| `src/plugins/plugin-lifecycle.ts` | activate / deactivate 生命周期 |
| `src/plugins/plugin-registry.ts` | 插件注册表（启用/禁用/查询） |
| `src/plugins/plugin-context-factory.ts` | 构建插件上下文对象 |
| `src/plugins/permissions.ts` | 权限常量定义 |
| `src/plugins/permission-checker.ts` | 运行时权限校验 |
| `src/plugins/plugin-commands.ts` | 插件命令注册/执行 |
| `src/plugins/plugin-editor.ts` | 编辑器 API 桥接 |
| `src/plugins/index.ts` | 插件系统统一入口 |
| `src/components/PluginPanel.tsx` | 插件管理面板 UI |
| `src/plugins/official/backlinks/` | 官方插件：反向链接 |
| `src/plugins/official/graph-view/` | 官方插件：知识图谱 |
| `src/plugins/official/snippet-manager/` | 官方插件：代码片段 |
| `docs/PLUGIN_DEV.md` | 插件开发指南 |
