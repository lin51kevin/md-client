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

---

## ✨ Features

### �️ 界面布局
- **ActivityBar** — VS Code 风格左侧活动栏，一键切换文件树、全局搜索、大纲、Git、插件等侧边栏面板；支持插件动态注册自定义面板
- **FloatingPanel** — 可拖拽、可调整大小的浮动面板（插件 AI Copilot 等使用），位置自动记忆
- **About Modal** — 应用关于页，展示版本号、MIT 许可证全文与快捷链接
- **文件悬浮预览** — 鼠标悬停文件树中的文件时，弹出浮窗预览该文件前 10 行内容

### �🖊️ WYSIWYG 预览编辑
- **Milkdown WYSIWYG Preview** — 基于 `@milkdown/crepe` 的所见即所得预览区，可直接在预览侧编辑文本，自动双向同步到编辑器
- **AST 精准编辑（Preview-Edit 插件）** — 通过 Markdown AST 解析器精确定位源码，支持段落、标题、引用块、列表项、代码块的原地编辑，含完整撤销/重做
- **悬浮 InlineToolbar** — 预览区选中文本后弹出格式化工具栏（加粗、斜体、代码等）

### 📝 编辑核心
- **Live Preview** — 实时分栏预览，编辑器与预览区同步滚动
- **Multi-Tab Editing** — 多标签页同时编辑，支持拖拽排序和右键菜单
- **Syntax Highlighting** — CodeMirror 6 驱动的代码高亮，支持 Markdown / JavaScript / Python / CSS / HTML 等语言
- **Auto-Save** — 智能防抖自动保存（1 秒延迟），内容无变化时跳过写入
- **Auto Brackets** — 自动补全括号、引号等成对符号
- **Vim Mode** — 可选 Vim 键盘模式，工具栏 Terminal 图标一键切换，默认关闭
- **Line Numbers & Fold Gutter** — 行号显示与代码折叠
- **Cursor Position** — 实时显示光标行列位置
- **📸 Image Paste** — 从剪贴板粘贴图片或拖拽图片，自动保存到本地并插入 Markdown 链接
- **✏️ Toolbar Formatting** — 一键格式化工具栏，涵盖：
  - 加粗、斜体、删除线、行内代码
  - 标题（循环升级 H1→H6）、引用块、无序/有序列表、任务列表
  - 代码块、分割线、链接、图片（本地/链接）、数学公式
  - **表格尺寸选择器** — 悬停 8×8 网格，点击即插入带表头的完整 Markdown 表格
- **📋 Right-Click Context Menu** — 编辑器内右键菜单，支持上下文感知的操作（20+个菜单项），可在表格内直接编辑
- **🎯 Writing Statistics** — 实时字数、字符数、句子数、阅读时间统计
- **⌨️ Custom Shortcuts** — 支持自定义快捷键绑定
- **🔗 Wiki-Link 导航** — `[[target]]` 语法支持文档间快速导航，单击或 Ctrl+Click 打开/创建链接文档，自动识别同文件夹内已存在的文档
- **🔭 命令面板** — `Ctrl+Shift+P` 快速命令执行，支持 20+ 核心操作的模糊搜索与最近命令优先排序
- **📌 片段管理器** — 文本模板与动态变量支持（`${date}`、`${time}`、`${filename}`、`${cursor}`），创建/编辑/删除片段，一键快速插入常用内容
- **🖱️ 多光标编辑** — `Alt+D` 选中当前单词的所有出现，`Alt+Up/Down` 在上/下一行添加光标，支持并行输入和删除

### 🎨 视图与主题
- **Three View Modes** — 仅编辑 / 分栏（默认）/ 仅预览，快捷键一键切换
- **Multiple Themes** — 四种主题：
  - ☀️ **Light** — GitHub Light 风格亮色主题
  - 🌙 **Dark** — GitHub Dark 暗色主题
  - 📜 **Sepia** — 护眼棕色调主题
  - 🔲 **High Contrast** — 高对比度主题
- **System Theme Follow** — 可选跟随操作系统深色模式，持久化到 localStorage
- **Focus Modes** — 三种专注模式：
  - 📝 **打字机模式** (Typewriter) — 当前行始终居中显示，隐藏工具栏与状态栏
  - 🖥️ **专注模式** (Focus) — 仅保留编辑器，暗化 UI，沉浸式写作
  - 🔲 **全屏模式** (Fullscreen) — 占满整个屏幕，按 ESC 或 F11 退出
- **Synchronized Scrolling** — 分栏模式下编辑区与预览区联动滚动
- **Welcome Page** — 空标签页欢迎页面，展示快捷操作入口和快捷键提示

### 🔍 搜索与导航
- **Find & Replace** — 全功能查找替换工具栏（`Ctrl+F` / `Ctrl+H`），支持：
  - 大小写敏感匹配 (`Aa`)
  - 正则表达式搜索 (`.*`)
  - 逐个/全部替换
  - 编辑器内高亮定位匹配项
- **Table of Contents (TOC)** — 左侧大纲侧边栏，自动提取 H1-H6 标题，支持折叠/展开子节点，点击跳转
- **Cross-File Search** — 在整个文件夹中搜索与替换，支持大小写敏感、正则表达式、未保存内容搜索
- **File Tree Sidebar** — 打开文件夹后，左侧显示文件树，支持双击打开、搜索过滤、新建/删除/重命名文件

### 📤 导出格式
- **DOCX** — 导出为 Word 文档（通过 Rust 后端渲染，支持 Mermaid 图表和数学公式）
- **PDF** — 导出为 PDF 文件（通过 Rust 后端渲染）
- **HTML** — 导出为独立 HTML 文件（前端生成，含完整样式）
- **PNG** — 导出为 PNG 图片（基于 html2canvas）
- **EPUB** — 导出为电子书格式（EPUB2/EPUB3），动态导入 epub-gen，从 YAML Frontmatter 提取元数据（标题、作者、描述）

### 🤖 AI Copilot
- **AI 辅助编辑面板** — 官方插件，支持智能改写、解释、翻译、总结，兼容 OpenAI 兼容接口（本地模型 + 云端模型）
- **完整 i18n 覆盖** — 面板所有 UI 文字支持中/英切换
- **消息气泡布局** — 用户消息右对齐、AI 消息左对齐带 Bot 图标，阅读体验更清晰

### 📐 富文本预览 (GFM+)
- **GFM Support** — 表格、任务列表、删除线、自动链接、脚注等
- **Math / LaTeX** — KaTeX 数学公式渲染（行内 `$...$` 与块级 `$$...$$`）
- **Mermaid Diagrams** — 流程图、时序图、饼图等图表渲染为 SVG
- **Code Highlighting** — highlight.js 驱动的代码块语法高亮
- **Custom Directives** — remark-directive 自定义容器支持
- **Footnotes** — 脚注定义 `[^1]` 与引用，预览自动渲染为链接
- **YAML Frontmatter** — 文档元数据支持，预览显示为表格
- **Table Editor** — 可视化编辑表格（双击或右键菜单打开，支持添加/删除行列、调整对齐）

### 💾 文件操作
- **Open / Save / Save As** — 原生文件对话框，支持 `.md` / `.markdown` / `.txt`
- **Drag & Drop** — 直接将 `.md` 文件拖入编辑器打开
- **CLI Integration** — 支持从命令行/文件管理器双击打开文件（`get_open_file` Tauri command）
- **File Tree CRUD** — 在文件树中直接新建、删除、重命名文件
- **Version Snapshots** — 本地版本快照系统（基于 localStorage）：
  - 每次手动保存时自动创建快照（最多保留 20 个）
  - 状态栏显示快照数量，点击可浏览历史版本
  - 一键恢复到任意历史快照

### 🌐 国际化
- **中英文双语** — 完整 i18n 覆盖，所有 UI 文本支持中/英切换
- **Settings Panel** — 统一设置弹窗，管理主题、语言、快捷键等偏好

### ⌨️ 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建标签页 |
| `Ctrl+O` | 打开文件 |
| `Ctrl+P` | 快速打开文件（模糊搜索） |
| `Ctrl+S` | 保存 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+W` | 关闭当前标签页 |
| `Ctrl+Tab` | 切换到下一个标签页 |
| `Ctrl+Shift+Tab` | 切换到上一个标签页 |
| `Ctrl+F` / `Ctrl+H` | 打开查找替换 |
| `Ctrl+Alt+1` | 切换到仅编辑视图 |
| `Ctrl+Alt+2` | 切换到分栏视图 |
| `Ctrl+Alt+3` | 切换到仅预览视图 |
| `Ctrl+Shift+M` | 打字机模式开关 |
| `Ctrl+Shift+F` | 专注模式开关 |
| `F11` | 全屏模式 |
| `Ctrl+Shift+P` | 命令面板（模糊搜索核心操作） |
| `Alt+D` | 选中当前单词的所有出现（多光标） |
| `Alt+Up` | 在上一行添加光标 |
| `Alt+Down` | 在下一行添加光标 |
| `Ctrl+Click` | Wiki-link 导航（创建/打开链接文档） |
| `ESC` | 退出焦点模式 / 关闭搜索栏 |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | [Tauri 2](https://v2.tauri.app/) (Rust) |
| Frontend | [React 19](https://react.dev/) + TypeScript ~5.8 |
| Editor Engine | [CodeMirror 6](https://codemirror.net/) via [@uiw/react-codemirror](https://github.com/uiwjs/react-codemirror) |
| Preview Renderer | [Milkdown Crepe](https://milkdown.dev/) (WYSIWYG) + [react-markdown](https://github.com/remarkjs/react-markdown) (fallback) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) (editor, preferences, UI stores) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) (CSS Variables 主题系统) |
| Build Tool | [Vite 7](https://vite.dev/) |
| Testing | [Vitest](https://vitest.dev/) + @testing-library/react |

### Key Dependencies

- **Editor:** `@codemirror/*` (autocomplete, commands, fold, lang-*, search, state, view, theme-one-dark)
- **WYSIWYG Preview:** `@milkdown/crepe`, `@milkdown/react`, `@milkdown/kit`
- **Markdown Preview (fallback):** `react-markdown`, `remark-gfm`, `remark-math`, `rehype-highlight`, `rehype-katex`
- **State Management:** `zustand`
- **Diagrams:** `mermaid` ^11
- **Math:** `katex` ^0.16
- **Icons:** `lucide-react`
- **Split Pane:** `react-split`
- **Tauri Plugins:** `plugin-dialog`, `plugin-fs`, `plugin-opener`

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Yarn](https://yarnpkg.com/) >= 1.22
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- Platform-specific Tauri dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

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
│   │   │   ├── ActivityBar.tsx       # VS Code 风格活动栏（侧边栏切换）
│   │   │   ├── EditorContentArea.tsx # 分栏/编辑/预览布局
│   │   │   ├── EditorContextMenu.tsx # 编辑器右键菜单
│   │   │   ├── DragOverlay.tsx       # 拖拽覆盖提示层
│   │   │   ├── ExportPanel.tsx       # 导出格式选择面板
│   │   │   ├── FileChangeToast.tsx   # 磁盘文件变更提示
│   │   │   ├── FileMenuDropdown.tsx  # 文件菜单下拉
│   │   │   ├── FileTreeContextMenu.tsx # 文件树右键菜单
│   │   │   └── AppContextMenus.tsx   # 全局右键菜单注册
│   │   ├── toolbar/                  # 工具栏组件
│   │   │   ├── Toolbar.tsx           # 主工具栏（文件菜单/格式化/视图/标签导航）
│   │   │   ├── ToolbarButton.tsx     # 工具栏按钮（action/toggle/view 变体）
│   │   │   ├── TabBar.tsx            # 标签栏（多标签/拖拽排序/右键菜单）
│   │   │   ├── TabContextMenu.tsx    # 标签右键菜单
│   │   │   ├── StatusBar.tsx         # 状态栏（路径/字数/行列/版本历史）
│   │   │   ├── CommandPalette.tsx    # 命令面板（Ctrl+Shift+P）
│   │   │   ├── QuickOpen.tsx         # 快速打开文件（Ctrl+P）
│   │   │   └── SearchPanel.tsx       # 跨文件搜索面板
│   │   ├── sidebar/                  # 侧边栏组件
│   │   │   ├── SidebarContainer.tsx  # 侧边栏容器与面板切换
│   │   │   ├── TocSidebar.tsx        # 大纲导航（可折叠标题树）
│   │   │   └── BreadcrumbNav.tsx     # 文件路径面包屑导航
│   │   ├── modal/                    # 弹窗/模态框组件
│   │   │   ├── SettingsModal.tsx     # 设置面板（主题/语言/快捷键）
│   │   │   ├── HelpModal.tsx         # 内置用户手册弹窗
│   │   │   ├── AboutModal.tsx        # 关于应用（版本/许可证）
│   │   │   ├── TableEditor.tsx       # 表格可视化编辑器
│   │   │   ├── TableSizePicker.tsx   # 表格尺寸网格选择器
│   │   │   ├── InputDialog.tsx       # 通用输入对话框
│   │   │   ├── DiffViewer.tsx        # AI 编辑差异对比视图
│   │   │   ├── FloatingPanel.tsx     # 可拖拽浮动面板（插件用）
│   │   │   ├── GitPanel.tsx          # Git 操作面板
│   │   │   ├── SnippetManager.tsx    # 片段管理器
│   │   │   ├── SnippetPicker.tsx     # 片段快速插入
│   │   │   ├── PermissionApprovalModal.tsx # 插件权限审批
│   │   │   └── UpdateNotification.tsx # 应用更新通知
│   │   ├── preview/                  # 预览区组件
│   │   │   ├── MarkdownPreview.tsx   # Markdown 渲染预览（Mermaid/KaTeX）
│   │   │   ├── PreviewContextMenu.tsx # 预览区右键菜单
│   │   │   ├── SlidePreview.tsx      # 幻灯片演示视图
│   │   │   └── MindmapView.tsx       # 思维导图视图
│   │   ├── file/                     # 文件树组件
│   │   │   ├── FileTreeSidebar.tsx   # 文件树侧边栏（CRUD/搜索过滤）
│   │   │   ├── FileTreeNode.tsx      # 文件树节点（展开/折叠/重命名）
│   │   │   ├── FileHoverPreview.tsx  # 文件悬浮预览（前 10 行）
│   │   │   └── CustomCssEditor.tsx   # 自定义 CSS 编辑器
│   │   ├── plugin/                   # 插件系统 UI 组件
│   │   │   ├── PluginPanel.tsx       # 插件管理面板
│   │   │   ├── PluginList.tsx        # 插件列表
│   │   │   ├── PluginCard.tsx        # 插件卡片
│   │   │   ├── SidebarRenderer.tsx   # 插件侧边栏内容渲染
│   │   │   └── ...                   # 其他插件 UI 组件
│   │   ├── milkdown/                 # Milkdown WYSIWYG 组件
│   │   │   ├── index.tsx             # Milkdown 编辑器入口
│   │   │   ├── FrontmatterPanel.tsx  # YAML Frontmatter 面板
│   │   │   ├── CodeBlockFoldOverlay.tsx # 代码块折叠覆盖
│   │   │   └── nodeviews/            # 自定义节点渲染
│   │   │       ├── MermaidBlockView.tsx  # Mermaid 图表节点
│   │   │       ├── LocalImageView.tsx    # 本地图片节点
│   │   │       ├── HtmlBlockView.ts      # HTML 块节点
│   │   │       └── WikiLinkNode.ts       # Wiki 链接节点
│   │   └── welcome/
│   │       └── WelcomePage.tsx       # 空标签页欢迎页
│   ├── stores/                       # Zustand 全局状态
│   │   ├── editor-store.ts           # 视图模式、分栏比例、会话状态
│   │   ├── preferences-store.ts      # 用户偏好（主题/Vim/自动保存等，持久化）
│   │   └── ui-store.ts               # 瞬态 UI 状态（模态框/右键菜单/侧边栏）
│   ├── hooks/                        # 自定义 React Hooks
│   │   ├── useTabs.ts                # 标签页状态管理
│   │   ├── useFileOps.ts             # 文件打开/保存/导出
│   │   ├── useScrollSync.ts          # 编辑器-预览同步滚动
│   │   ├── useDragDrop.ts            # 文件拖放处理
│   │   ├── useKeyboardShortcuts.ts   # 全局快捷键绑定
│   │   ├── useCursorPosition.ts      # 光标位置追踪
│   │   ├── useFocusMode.ts           # 焦点模式（打字机/专注/全屏）
│   │   ├── useSearchHighlight.ts     # 搜索结果高亮
│   │   ├── useFormatActions.ts       # 格式化操作
│   │   ├── useImagePaste.ts          # 图片粘贴处理
│   │   ├── useWindowTitle.ts         # 窗口标题同步
│   │   ├── useDocMetrics.ts          # 防抖文档分析（TOC + 字数统计）
│   │   ├── useVersionHistory.ts      # 版本快照生命周期
│   │   ├── useTableEditor.ts         # 表格编辑器状态
│   │   ├── useSnippetFlow.ts         # 片段插入状态与逻辑
│   │   ├── useEditorInstance.ts      # CodeMirror 编辑器生命周期
│   │   ├── useGit.ts                 # Git 操作 Hook
│   │   ├── useAutoUpgrade.ts         # 自动更新检测
│   │   ├── useFileWatcher.ts         # 磁盘文件变更监听
│   │   ├── usePlugins.ts             # 插件系统管理
│   │   └── ...                       # 其他 Hooks
│   ├── i18n/                         # 国际化
│   │   ├── en.ts                     # 英文语言包
│   │   └── zh-CN.ts                  # 中文语言包
│   ├── lib/                          # 工具库（按领域子目录组织）
│   │   ├── cm/                       # CodeMirror 扩展
│   │   │   ├── cm-themes.ts          # Sepia/High-Contrast 主题
│   │   │   ├── cmAutocomplete.ts     # 自动补全括号
│   │   │   ├── cmVim.ts              # Vim 模式集成
│   │   │   ├── multicursor-keymap.ts # 多光标键盘映射
│   │   │   └── cm-languages.ts       # 多语言支持
│   │   ├── editor/                   # 编辑器工具
│   │   │   ├── auto-save.ts          # 防抖自动保存
│   │   │   ├── text-format.ts        # 文本格式化
│   │   │   ├── shortcuts-config.ts   # 快捷键配置
│   │   │   ├── context-menu.ts       # 右键菜单逻辑
│   │   │   ├── command-registry.ts   # 命令注册中心
│   │   │   ├── split-preference.ts   # 分栏比例记忆
│   │   │   └── vim-mode.ts           # Vim 模式状态
│   │   ├── markdown/                 # Markdown 处理
│   │   │   ├── pipeline.ts           # remark/rehype 插件管道
│   │   │   ├── toc.ts                # TOC 标题提取
│   │   │   ├── table-parser.ts       # 表格解析
│   │   │   ├── mermaid.ts            # Mermaid 渲染
│   │   │   ├── html-export.ts        # HTML 导出生成
│   │   │   ├── export-prerender.ts   # 导出预渲染
│   │   │   ├── latex.ts              # LaTeX 处理
│   │   │   ├── slide-parser.ts       # 幻灯片解析
│   │   │   └── mindmap-converter.ts  # 思维导图转换
│   │   ├── file/                     # 文件操作工具
│   │   │   ├── recent-files.ts       # 最近文件管理
│   │   │   ├── git-commands.ts       # Git 命令封装
│   │   │   ├── pending-images.ts     # 待迁移图片处理
│   │   │   └── reveal-in-explorer.ts # 在资源管理器中显示
│   │   ├── storage/                  # 本地存储
│   │   │   ├── storage-keys.ts       # localStorage key 常量
│   │   │   ├── version-history.ts    # 版本快照系统
│   │   │   ├── snippets.ts           # 片段存储
│   │   │   └── tab-session.ts        # 标签会话持久化
│   │   ├── theme/                    # 主题系统
│   │   │   ├── manager.ts            # 主题管理器
│   │   │   ├── registry.ts           # 主题注册
│   │   │   ├── auto.ts               # 系统主题跟随
│   │   │   └── storage.ts            # 主题持久化
│   │   ├── ui/                       # UI 工具
│   │   │   ├── custom-css.ts         # 自定义 CSS 应用
│   │   │   └── css-templates.ts      # CSS 模板管理
│   │   ├── search/                   # 搜索引擎
│   │   │   └── search.ts             # 跨文件搜索/替换
│   │   ├── milkdown/                 # Milkdown 工具
│   │   │   ├── editor-bridge.ts      # Milkdown ↔ CodeMirror 同步桥接
│   │   │   └── sync.ts               # 双向同步逻辑
│   │   └── utils/                    # 通用工具
│   │       ├── word-count.ts         # 字数统计
│   │       ├── writing-stats.ts      # 写作统计
│   │       ├── image-paste.ts        # 图片粘贴工具
│   │       ├── path.ts               # 路径处理
│   │       ├── errors.ts             # 错误工具
│   │       └── html-safety.ts        # HTML 安全处理
│   ├── plugins/                      # 插件系统核心
│   │   ├── plugin-registry.ts        # 插件注册中心
│   │   ├── plugin-loader.ts          # 插件加载器
│   │   ├── plugin-sandbox.ts         # 插件沙箱隔离
│   │   ├── signature-verify.ts       # 插件签名验证
│   │   ├── official/                 # 官方内置插件（AI Copilot 等）
│   │   └── registry/                 # 插件注册表
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
│       └── USER_GUIDE.md             # 用户指南
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
- `feat:` → Added
- `fix:` → Fixed
- `perf:` → Performance
- `refactor:` / `chore:` → Changed

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

## License

This project is licensed under the [MIT License](LICENSE).
