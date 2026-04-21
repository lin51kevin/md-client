# MarkLite

<p align="center">
  <strong>一款轻量、快速的桌面 Markdown 编辑器</strong><br/>
  基于 <strong>Tauri 2</strong> + <strong>React 19</strong> + <strong>CodeMirror 6</strong> 构建
</p>

<p align="center">

![MarkLite 界面预览](./docs/assets/screenshot.png)

</p>

<p align="center">
  <a href="./docs/guides/USER_GUIDE.md">中文用户手册</a> &nbsp;|&nbsp;
  <a href="#✨-features">功能特性</a> &nbsp;|&nbsp;
  <a href="#getting-started">快速开始</a> &nbsp;|&nbsp;
  <a href="#tech-stack">技术栈</a>
</p>

***

## ✨ Features

### 🔲 界面布局

* **ActivityBar** — VS Code 风格左侧活动栏，一键切换文件树、全局搜索、大纲、Git、插件等侧边栏面板；支持插件动态注册自定义面板

* **FloatingPanel** — 可拖拽、可调整大小的浮动面板（插件 AI Copilot 等使用），位置自动记忆

* **About Modal** — 应用关于页，展示版本号、MIT 许可证全文与快捷链接

* **文件悬浮预览** — 鼠标悬停文件树中的文件时，弹出浮窗预览该文件前 10 行内容

### 🖊️ WYSIWYG 预览编辑

* **Milkdown WYSIWYG Preview** — 基于 `@milkdown/crepe` 的所见即所得预览区，可直接在预览侧编辑文本，自动双向同步到编辑器

* **AST 精准编辑（Preview-Edit 插件）** — 通过 Markdown AST 解析器精确定位源码，支持段落、标题、引用块、列表项、代码块的原地编辑，含完整撤销/重做

* **悬浮 InlineToolbar** — 预览区选中文本后弹出格式化工具栏（加粗、斜体、代码等）

### 📝 编辑核心

* **Live Preview** — 实时分栏预览，编辑器与预览区同步滚动

* **Multi-Tab Editing** — 多标签页同时编辑，支持拖拽排序和右键菜单

* **Syntax Highlighting** — CodeMirror 6 驱动的代码高亮，支持 Markdown / JavaScript / Python / CSS / HTML 等语言

* **Auto-Save** — 智能防抖自动保存（1 秒延迟），内容无变化时跳过写入

* **Auto Brackets** — 自动补全括号、引号等成对符号

* **Vim Mode** — 可选 Vim 键盘模式，工具栏 Terminal 图标一键切换，默认关闭

* **Line Numbers & Fold Gutter** — 行号显示与代码折叠

* **Cursor Position** — 实时显示光标行列位置

* **📸 Image Paste** — 从剪贴板粘贴图片或拖拽图片，自动保存到本地并插入 Markdown 链接

* **✏️ Toolbar Formatting** — 一键格式化工具栏，涵盖：

  * 加粗、斜体、删除线、行内代码

  * 标题（循环升级 H1→H6）、引用块、无序/有序列表、任务列表

  * 代码块、分割线、链接、图片（本地/链接）、数学公式

  * **表格尺寸选择器** — 悬停 8×8 网格，点击即插入带表头的完整 Markdown 表格

* **📋 Right-Click Context Menu** — 编辑器内右键菜单，支持上下文感知的操作（20+个菜单项），可在表格内直接编辑

* **🎯 Writing Statistics** — 实时字数、字符数、句子数、阅读时间统计

* **⌨️ Custom Shortcuts** — 支持自定义快捷键绑定

* **🔗 Wiki-Link 导航** — `[[target]]` 语法支持文档间快速导航，单击或 Ctrl+Click 打开/创建链接文档，自动识别同文件夹内已存在的文档

* **🔭 命令面板** — `Ctrl+Shift+P` 快速命令执行，支持 20+ 核心操作的模糊搜索与最近命令优先排序

* **📌 片段管理器** — 文本模板与动态变量支持（`${date}`、`${time}`、`${filename}`、`${cursor}`），创建/编辑/删除片段，一键快速插入常用内容

* **🖱️ 多光标编辑** — `Alt+D` 选中当前单词的所有出现，`Alt+Up/Down` 在上/下一行添加光标，支持并行输入和删除

### 🎨 视图与主题

* **Three View Modes** — 仅编辑 / 分栏（默认）/ 仅预览，快捷键一键切换

* **Multiple Themes** — 四种主题：

  * ☀️ **Light** — GitHub Light 风格亮色主题

  * 🌙 **Dark** — GitHub Dark 暗色主题

  * 📜 **Sepia** — 护眼棕色调主题

  * 🔲 **High Contrast** — 高对比度主题

* **System Theme Follow** — 可选跟随操作系统深色模式，持久化到 localStorage

* **Focus Modes** — 三种专注模式：

  * 📝 **打字机模式** (Typewriter) — 当前行始终居中显示，隐藏工具栏与状态栏

  * 🖥️ **专注模式** (Focus) — 仅保留编辑器，暗化 UI，沉浸式写作

  * 🔲 **全屏模式** (Fullscreen) — 占满整个屏幕，按 ESC 或 F11 退出

* **Synchronized Scrolling** — 分栏模式下编辑区与预览区联动滚动

* **Welcome Page** — 空标签页欢迎页面，展示快捷操作入口和快捷键提示

### 🔍 搜索与导航

* **Find & Replace** — 全功能查找替换工具栏（`Ctrl+F` / `Ctrl+H`），支持：

  * 大小写敏感匹配 (`Aa`)

  * 正则表达式搜索 (`.*`)

  * 逐个/全部替换

  * 编辑器内高亮定位匹配项

* **Table of Contents (TOC)** — 左侧大纲侧边栏，自动提取 H1-H6 标题，支持折叠/展开子节点，点击跳转

* **Cross-File Search** — 在整个文件夹中搜索与替换，支持大小写敏感、正则表达式、未保存内容搜索

* **File Tree Sidebar** — 打开文件夹后，左侧显示文件树，支持双击打开、搜索过滤、新建/删除/重命名文件

### 📤 导出格式

* **DOCX** — 导出为 Word 文档（通过 Rust 后端渲染，支持 Mermaid 图表和数学公式）

* **PDF** — 导出为 PDF 文件（通过 Rust 后端渲染）

* **HTML** — 导出为独立 HTML 文件（前端生成，含完整样式）

* **PNG** — 导出为 PNG 图片（基于 html2canvas）

* **EPUB** — 导出为电子书格式（EPUB2/EPUB3），动态导入 epub-gen，从 YAML Frontmatter 提取元数据（标题、作者、描述）

### 🤖 AI Copilot

* **AI 辅助编辑面板** — 官方插件，支持智能改写、解释、翻译、总结，兼容 OpenAI 兼容接口（本地模型 + 云端模型）

* **完整 i18n 覆盖** — 面板所有 UI 文字支持中/英切换

* **消息气泡布局** — 用户消息右对齐、AI 消息左对齐带 Bot 图标，阅读体验更清晰

### 📐 富文本预览 (GFM+)

* **GFM Support** — 表格、任务列表、删除线、自动链接、脚注等

* **Math / LaTeX** — KaTeX 数学公式渲染（行内 `$...$` 与块级 `$$...$$`）

* **Mermaid Diagrams** — 流程图、时序图、饼图等图表渲染为 SVG

* **Code Highlighting** — highlight.js 驱动的代码块语法高亮

* **Custom Directives** — remark-directive 自定义容器支持

* **Footnotes** — 脚注定义 `[^1]` 与引用，预览自动渲染为链接

* **YAML Frontmatter** — 文档元数据支持，预览显示为表格

* **Table Editor** — 可视化编辑表格（双击或右键菜单打开，支持添加/删除行列、调整对齐）

### 💾 文件操作

* **Open / Save / Save As** — 原生文件对话框，支持 `.md` / `.markdown` / `.txt`

* **Drag & Drop** — 直接将 `.md` 文件拖入编辑器打开

* **CLI Integration** — 支持从命令行/文件管理器双击打开文件（`get_open_file` Tauri command）

* **File Tree CRUD** — 在文件树中直接新建、删除、重命名文件

* **Version Snapshots** — 本地版本快照系统（基于 localStorage）：

  * 每次手动保存时自动创建快照（最多保留 20 个）

  * 状态栏显示快照数量，点击可浏览历史版本

  * 一键恢复到任意历史快照

### 🌐 国际化

* **中英文双语** — 完整 i18n 覆盖，所有 UI 文本支持中/英切换

* **Settings Panel** — 统一设置弹窗，管理主题、语言、快捷键等偏好

### ⌨️ 键盘快捷键

| 快捷键                 | 功能             |
| ------------------- | -------------- |
| `Ctrl+N`            | 新建标签页          |
| `Ctrl+O`            | 打开文件           |
| `Ctrl+P`            | 快速打开文件（模糊搜索）   |
| `Ctrl+S`            | 保存             |
| `Ctrl+Shift+S`      | 另存为            |
| `Ctrl+W`            | 关闭当前标签页        |
| `Ctrl+Tab`          | 切换到下一个标签页      |
| `Ctrl+Shift+Tab`    | 切换到上一个标签页      |
| `Ctrl+F` / `Ctrl+H` | 打开查找替换         |
| `Ctrl+Alt+1`        | 切换到仅编辑视图       |
| `Ctrl+Alt+2`        | 切换到分栏视图        |
| `Ctrl+Alt+3`        | 切换到仅预览视图       |
| `ESC`               | 退出焦点模式 / 关闭搜索栏 |

## Tech Stack

| Layer            | Technology                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Desktop Shell    | [Tauri 2](https://v2.tauri.app/) (Rust)                                                                                     |
| Frontend         | [React 19](https://react.dev/) + TypeScript \~5.8                                                                           |
| Editor Engine    | [CodeMirror 6](https://codemirror.net/) via [@uiw/react-codemirror](https://github.com/uiwjs/react-codemirror)              |
| Preview Renderer | [Milkdown Crepe](https://milkdown.dev/) (WYSIWYG) + [react-markdown](https://github.com/remarkjs/react-markdown) (fallback) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) (editor, preferences, UI stores)                                                   |
| Styling          | [Tailwind CSS 4](https://tailwindcss.com/) (CSS Variables 主题系统)                                                             |
| Build Tool       | [Vite 7](https://vite.dev/)                                                                                                 |
| Testing          | [Vitest](https://vitest.dev/) + @testing-library/react                                                                      |

### Key Dependencies

* **Editor:** `@codemirror/*` (autocomplete, commands, fold, lang-\*, search, state, view, theme-one-dark)

* **WYSIWYG Preview:** `@milkdown/crepe`, `@milkdown/react`, `@milkdown/kit`

* **Markdown Preview (fallback):** `react-markdown`, `remark-gfm`, `remark-math`, `rehype-highlight`, `rehype-katex`

* **State Management:** `zustand`

* **Diagrams:** `mermaid` ^11

* **Math:** `katex` ^0.16

* **Icons:** `lucide-react`

* **Split Pane:** `react-split`

* **Tauri Plugins:** `plugin-dialog`, `plugin-fs`, `plugin-opener`

## Prerequisites

* [Node.js](https://nodejs.org/) >= 18

* [Yarn](https://yarnpkg.com/) >= 1.22

* [Rust](https://www.rust-lang.org/tools/install) (latest stable)

* Platform-specific Tauri dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/lin51kevin/md-client.git
cd md-client

# Install dependencies
yarn install

# Run in development mode
yarn tauri dev

# Build for production
yarn tauri build
```

## Project Structure

```
marklite/
├── src/                              # React 前端
│   ├── components/                   # UI 组件（按功能子目录组织）
│   │   ├── AppShell.tsx              # 主布局与核心逻辑编排
│   │   ├── AppProviders.tsx          # Context / Store 初始化
│   │   ├── AppGlobalOverlays.tsx     # 全局浮层（模态框、右键菜单、通知）
│   │   ├── editor/                   # 编辑器区域组件
│   │   ├── toolbar/                  # 工具栏组件
│   │   ├── sidebar/                  # 侧边栏组件
│   │   ├── modal/                    # 弹窗/模态框组件
│   │   ├── preview/                  # 预览区组件
│   │   ├── file/                     # 文件树组件
│   │   ├── plugin/                   # 插件系统 UI 组件
│   │   ├── milkdown/                 # Milkdown WYSIWYG 组件
│   │   │   └── nodeviews/            # 自定义节点渲染
│   │   └── welcome/
│   ├── stores/                       # Zustand 全局状态
│   ├── hooks/                        # 自定义 React Hooks
│   ├── i18n/                         # 国际化
│   ├── lib/                          # 工具库（按领域子目录组织）
│   │   ├── cm/                       # CodeMirror 扩展
│   │   ├── editor/                   # 编辑器工具
│   │   ├── markdown/                 # Markdown 处理
│   │   ├── file/                     # 文件操作工具
│   │   ├── storage/                  # 本地存储
│   │   ├── theme/                    # 主题系统
│   │   ├── ui/                       # UI 工具
│   │   ├── search/                   # 搜索引擎
│   │   ├── milkdown/                 # Milkdown 工具
│   │   └── utils/                    # 通用工具
│   ├── plugins/                      # 插件系统核心
│   ├── __tests__/                    # 单元测试
│   ├── App.tsx                       # 应用入口组件
│   ├── types.ts                      # TypeScript 全局类型
│   ├── constants.ts                  # 全局常量
│   └── main.tsx                      # 应用启动入口
├── src-tauri/                        # Tauri (Rust) 后端
│   ├── src/                          # Rust 源码（文件操作/导出/工具调用等）
│   ├── capabilities/                 # Tauri 权限配置
│   ├── icons/                        # 应用图标
│   └── tauri.conf.json               # Tauri 配置（版本/窗口/插件/权限）
├── packages/                         # 内部 monorepo 包
├── scripts/                          # 构建脚本
├── docs/                             # 文档
│   └── guides/
├── package.json
├── vite.config.ts                    # Vite 构建配置
├── vitest.config.ts                  # 单元测试配置
└── CHANGELOG.md                      # 变更日志
```

## Changelog

This project uses [git-chglog](https://github.com/git-chglog/git-chglog) to generate changelogs from git commit history.

```bash
# Generate full CHANGELOG.md (all versions)
yarn changelog

# Preview latest version only
yarn changelog:latest

# Manual usage (requires git-chglog installed)
git-chglog                    # Preview all
git-chglog -o CHANGELOG.md    # Write to file
git-chglog v0.1.0..           # Changes since v0.1.0
```

**Note**: Commits should follow [Conventional Commits](https://www.conventionalcommits.org/) format:

* `feat:` → Added

* `fix:` → Fixed

* `perf:` → Performance

* `refactor:` / `chore:` → Changed

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

## License

This project is licensed under the [MIT License](LICENSE).
