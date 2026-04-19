# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [v0.9.5] - 2026-04-19

### Added

#### ActivityBar（VS Code 风格活动栏）
- **ActivityBar** — 左侧活动栏统一管理侧边栏面板（文件树 / 全局搜索 / 大纲 / Git / 插件）
- 支持插件动态注册自定义面板，可通过图标切换显示/隐藏
- 浮动面板模式（FloatingPanel）：可拖拽、可调整大小、位置持久化

#### About 弹窗（关于应用）
- **About Modal** — 展示应用名称、版本号、MIT 许可证全文
- 提供 GitHub 主页、Issues 反馈、用户指南的快速跳转链接

#### 文件悬浮预览（File Hover Preview）
- 鼠标悬停文件树中的文件时，弹出浮窗预览该文件前 10 行内容
- 自动感知视口边缘，防止预览窗超出屏幕

#### Milkdown 自定义 Node Views
- **HtmlBlockView** — Milkdown 中 HTML 块节点自定义渲染
- **LocalImageView** — Milkdown 中本地图片节点（通过 Tauri fs 读取，base64 展示）
- **MermaidBlockView** — Milkdown 中 Mermaid 图表节点渲染为 SVG
- **WikiLinkNode / wikiLinkPlugin** — Milkdown 中 `[[wiki-link]]` 节点渲染与导航

### Refactor

#### Zustand 全局状态管理（State Architecture）
- **引入 Zustand** — 新增 `src/stores/` 目录，集中管理全局状态，替换原来分散在各 Hook 中的 `localStorage` 读写
  - `editor-store.ts` — 视图模式（viewMode）、分栏比例（splitSizes）、会话恢复标志
  - `preferences-store.ts` — 用户偏好（主题、Vim 模式、自动保存、拼写检查等），通过 Zustand `persist` 中间件自动持久化
  - `ui-store.ts` — 瞬态 UI 状态（模态框显示、右键菜单、侧边栏活动面板、拖拽状态）

#### 应用结构拆分（App Architecture）
- `App.tsx` 拆分为 `AppShell.tsx`（布局与核心逻辑）、`AppProviders.tsx`（Context/Store 初始化）、`AppGlobalOverlays.tsx`（全局浮层：模态框、通知、右键菜单）
- 导出面板独立为 `ExportPanel.tsx`（格式选择 UI），统一替代原来各处的直接导出调用

---

## [v0.9.4] - 2026-04-18

### Added

#### Quick Open（快速打开文件，Ctrl+P）
- **VS Code 风格的 Ctrl+P 快速打开** — 模糊搜索工作区内所有文件
- 最近打开文件优先排列
- 键盘导航：↑↓ 选择、Enter 打开、Esc 关闭

#### Preview Context Menu（预览区右键菜单）
- 在预览区右键弹出操作菜单：复制、复制为 Markdown、全选、查看源码
- 分栏视图与仅预览视图均已接入

#### Breadcrumb Navigation（文件路径面包屑导航）
- 标签栏与编辑器之间展示当前文件路径面包屑
- 路径各级文件夹可点击，快速切换文件树根目录

### Refactor

#### 代码结构重组（Components & Lib）
- **`src/components/`** 按功能子目录拆分：`editor/`、`file/`、`toolbar/`、`modal/`、`sidebar/`、`preview/`、`plugin/`、`welcome/`
- **`src/lib/`** 按领域子目录拆分：`cm/`、`editor/`、`file/`、`markdown/`、`milkdown/`、`search/`、`storage/`、`theme/`、`ui/`、`utils/`
- `BreadcrumbNav` 从 `editor/` 迁移至 `sidebar/`（语义更准确）
- 修正错位的测试文件，使测试目录结构与组件目录完全对齐

### Fixed

- 测试环境 ESM 兼容性：将 vitest 环境从 `jsdom` 切换为 `happy-dom`，解决 `jsdom@29` 依赖链 `@exodus/bytes`（纯 ESM）导致的 `ERR_REQUIRE_ESM` 错误
- 修正 `Toolbar.test.tsx` 中 i18n mock 缺失 `about.title`、按钮 handler 对应错误等问题
- 修正 `StatusBar.test.tsx` CSS 变量样式断言方式（改用 `getAttribute('style')`）
- 修正 `useEditorContextActions.test.ts` 中 `navigator.clipboard` 只读属性赋值问题

---

## [v0.9.3] - 2026-04-17

### Added

#### 标签页快捷键切换（Tab Keyboard Shortcuts）
- **Ctrl+Tab** — 切换到下一个标签页（循环）
- **Ctrl+Shift+Tab** — 切换到前一个标签页（循环）
- 支持用户自定义快捷键（Settings > Keyboard Shortcuts）
- 包括固定标签页在循环中
- 单个标签页时安全（无操作）

#### AI Agent 工具调用（AI Agent Tool Use）
- **工具注册中心（Tool Registry）** — 设计工具抽象层，支持结构化工具调用
- **Tauri 后端工具实现** — Rust 跨平台实现以下工具：
  - `search` — 在文档中搜索文本，返回匹配位置和上下文
  - `replace` — 替换文档指定文本（第一个或全部）
  - `get_lines` — 获取指定行号范围内容
  - `replace_lines` — 替换指定行号范围
  - `insert` — 在指定行号位置插入内容
  - `delete_lines` — 删除指定行号范围
  - `get_outline` — 获取文档大纲（所有标题及行号）
  - `regex_replace` — 正则表达式替换
  - `get_headings` — 获取标题层级结构
- **AI Agent 循环** — 支持 OpenAI function calling 工作流：
  - Tool calling response 自动提取，填充 tool_call_id
  - 执行工具链，累积 ToolResult
  - 循环调用 AI，直到 stop_reason=stop
- **编辑差异预览（Diff Preview）** — Tool 执行结果以 Diff 形式可视化预览
- **批量应用（Batch Apply）** — 一键应用所有编辑变更

### Fixed

- 修复 AI 工具调用中的文本编码问题
- 优化大文件处理时的性能

### Performance

- Tauri 后端工具调用直接操作文本，性能显著提升

---

## [v0.9.2] - 2026-04-16

### Added

#### AI 深度集成（AI Deep Integration）
- **Milkdown 浮动工具栏 AI 操作** — 集成润色 / 改写 / 翻译 / 总结到 Milkdown 浮动 toolbar
- **AI 聊天 Markdown 渲染** — 聊天面板 AI 回复以格式化 Markdown 渲染
- **AI 上下文菜单插件化** — AI 右键菜单项迁移至 AI Copilot 插件

#### 文件拖拽增强（Drag & Drop Enhancement）
- **文件夹拖拽** — 增强文件夹拖拽功能与相关测试

### Changed

- **插件外置架构** — 官方插件从主 bundle 中分离，独立打包至 Tauri 资源目录加载
- **原生对话框** — 未保存变更对话框改用原生 OS 对话框
- **AI 聊天 UI** — 优化聊天窗口按钮风格与交互
- 移除废弃的 preview-edit 和 snippet-manager 插件

### Fixed

- 修复快速打开同一文件时产生重复标签页的问题
- 修复 viewMode 在保存和重新挂载后无法持久化的问题
- 修复 tauri-plugin-fs watch 功能未启用的问题
- 修复打包构建中 AI Copilot 不加载的问题
- 修复 AI 聊天斜杠命令键盘导航与选择范围
- 修复 Milkdown 内联工具栏 CSS 样式
- 移除插件右键菜单硬编码图标

### Performance

- **Bundle 瘦身** — 裁剪 Mermaid、KaTeX 字体、CodeMirror 语言包
- **Rust 优化** — Release profile 优化，减小二进制体积

---

## [v0.9.1] - 2026-04-16

### Added

#### AI 文本选区处理（AI Text Selection）
- **useAISelection hook** — 编辑器内选中文本后，右键菜单出现 AI 操作项（润色、解释、翻译、摘要、改写）
- **AIResultModal 组件** — 以浮层展示 AI 处理结果，支持一键复制或替换选中内容
- **ai-prompts 库** — 内置 5 类提示词（polish / explain / translate / summarize / rewrite），可复用于其他场景
- i18n 完整覆盖（中/英）

#### CSS 模板管理器（CSS Template Manager）
- **CssTemplateManager 组件** — 设置 > Appearance 新增模板管理面板：
  - 保存当前自定义 CSS 为命名模板
  - 一键加载、删除已保存模板
  - 导出 / 导入模板 JSON 文件
- **css-templates 库** — localStorage 持久化，支持模板增删改查

#### 代码块折叠（Code Block Fold for Milkdown Preview）
- **useCodeBlockFold hook** — Milkdown 预览区代码块右上角新增折叠/展开按钮
- 折叠状态通过 localStorage 跨会话持久化
- **CodeBlockFoldOverlay 组件** — 基于 MutationObserver 动态挂载折叠覆层

#### 打字机模式增强（Typewriter Mode Enhancements）
- **useTypewriterOptions hook** — 新增三个打字机选项：
  - 非当前段落半透明（Dim others）
  - 隐藏非必要 UI（Hide UI）
  - 显示专注计时器（Focus duration）
- **format-duration 工具** — 将专注时长格式化为 `mm:ss` 显示
- **typewriter-dim CSS 类** — 段落半透明淡出效果

#### 快捷键增强（Shortcuts Enhancement）
- 快捷键配置新增 `category` 字段，支持按类别分组展示
- 新增 `detectConflict` 冲突检测功能，阻止绑定已占用按键
- 新增快捷键：切换面板（Toggle Panels）、折叠代码块（Fold Code Block）

#### 状态栏增强（StatusBar Enhancement）
- 新增：**阅读时间**（基于字数估算）、**Vim 模式指示器**、**保存状态**、**专注计时器**

### Fixed

- 修复 `CodeBlockFoldOverlay` 无限循环与序列化 Bug
- 修复字数统计测试预期值及阅读时间计算逻辑
- 梳理外观设置 UI，减少重复功能入口（CSS 模板管理器 vs 自定义 CSS 编辑器）

### Refactored

- 将应用内 HelpModal 替换为指向 GitHub `USER_GUIDE.md` 的外链，减少包体积
- `USER_GUIDE.md` 移至项目根目录，方便 GitHub 直接访问

### Tests

- 新增 `AIResultModal.test.tsx` — AI 结果弹窗组件测试
- 新增 `useAISelection.test.ts` — AI 选区 hook 完整测试
- 新增 `useCodeBlockFold.test.ts` — 代码块折叠 hook 测试
- 新增 `useTypewriterOptions.test.ts` — 打字机选项 hook 测试
- 新增 `format-duration.test.ts` — 时长格式化工具测试
- 新增 `css-templates.test.ts` — CSS 模板库测试
- 新增 `useWordCount.test.ts` — 字数统计 hook 测试

---

## [v0.9.0] - 2026-04-15

### Added

#### 磁盘文件变更检测（File Watcher）
- **useFileWatcher hook** — 基于 Tauri `fs.watch` API 实时监控打开文件的磁盘变更：
  - 外部修改：Toast 提示"文件已在外部修改"，提供**重新加载**按钮
  - 外部删除：Toast 提示文件已被删除
  - 防抖处理（500ms），避免大量写操作触发多次通知
  - 组件卸载时自动清理 watcher（防内存泄漏）

#### 自动升级（Auto Upgrade）
- **useAutoUpgrade hook** — 基于 Tauri Updater 插件的自动更新流程：
  - 启动时自动检测新版本
  - Toast 通知 + 进度条展示下载进度
  - 下载完成后提示重启安装
  - 设置面板新增"自动检查更新"开关，支持关闭自动检查
  - i18n 完整覆盖（中/英）更新设置 UI

#### 工具栏撤销/重做（Toolbar Undo/Redo）
- 工具栏新增 **撤销（Undo）** 和 **重做（Redo）** 快捷按钮
- 直接调用 CodeMirror `undo` / `redo` 命令
- 与键盘快捷键 `Ctrl+Z` / `Ctrl+Shift+Z` 完全同步

#### 文件夹拖拽到文件树（Folder Drag-to-FileTree）
- 支持将操作系统文件夹**拖拽到应用窗口**，自动在文件树中展开该文件夹
- 与已有的文件拖拽逻辑保持统一（单文件拖拽已于 v0.7.x 支持）

#### 文件类型关联（File Type Association）
- **Windows 安装程序（NSIS）** 注册 `.md` / `.markdown` 文件关联：
  - 双击 `.md` 文件自动用 MarkLite 打开
  - 右键菜单"用 MarkLite 打开"
- Tauri `tauri.conf.json` 同步配置文件类型关联

#### AI Copilot 增强
- **Stop Generation 按钮** — AI 对话面板新增停止生成按钮，可随时中断响应流
- **编辑工作流改进** — Apply 动作更精准地插入/替换编辑器内容
- **i18n 完整覆盖** — AI Copilot 编辑相关操作全部接入 `t()` 翻译

#### 编码自动检测（Encoding Auto-Detection）
- 文件打开时自动检测编码（支持 GBK / GB18030 / UTF-8 / BOM 等）
- 中文 Windows 环境下非 UTF-8 文件不再乱码
- 底部状态栏显示当前文件编码

### Fixed

- 修复分栏模式下编辑器窗格压缩预览区的布局问题
- 修复幻灯片 / 思维导图切换时 AI Copilot 对话状态丢失的问题
- 修复所有 TypeScript 构建错误

### Tests

- 新增 `useFileWatcher.test.ts` — 文件监控 hook 完整测试
- 新增 `prompt-builder.test.ts` — AI 提示词构建测试
- 新增 `openai-compatible.test.ts` — OpenAI 兼容 Provider 测试

---

## [v0.8.0] - 2026-04-15

### Added

#### Milkdown WYSIWYG 预览（重大架构升级）
- **MilkdownPreview 组件** — 基于 `@milkdown/crepe` 的全功能 WYSIWYG 富文本预览，替代 react-markdown：
  - 分栏模式下预览区可直接编辑（所见即所得）
  - 编辑器（CodeMirror）↔ 预览（Milkdown）双向同步，实时保持一致
  - 内置 **Toolbar**：加粗、斜体、代码、链接等格式一键应用
  - 原生支持 GFM 表格、任务列表、LaTeX 数学公式、代码块高亮
  - **MermaidBlockView** — Crepe renderPreview API 渲染 Mermaid 图表为 SVG
  - **LocalImageView** — Tauri 本地图片自动加载（解决 file:// 路径问题）
  - **WikiLinkPlugin** — `[[target]]` 语法通过 Milkdown native Node + remark 插件支持
  - **FrontmatterPanel** — YAML Frontmatter 以 React 组件形式渲染为表格，不污染编辑区
  - 保留 MarkdownPreview 作为回退方案（`useMilkdownPreview` prop 控制）

#### 预览编辑增强 — AST 精准定位（Preview-Edit Plugin v2）
- **MarkdownAST 解析器** — 将 Markdown 源码解析为带字符偏移量的 AST 节点树
- **PositionMapManager** — 维护 AST 节点到源码偏移量的精确映射
- **EditHistoryManager** — 完整的撤销/重做支持（含历史状态管理）
- **自动格式化库（auto-format.ts）** — 智能 Markdown 格式化（列表缩进、代码块对齐等）
- **EditableBlock 组件** — 基于 textarea 的行内块级编辑，支持键盘确认/取消
- **InlineToolbar 组件** — 悬浮格式化工具栏（Phase 2 基础，支持选区感知）
- **EditablePreview 组件** — 整合以上模块，以 AST 偏移量替代脆弱的字符串替换
- Preview-Edit 插件现支持：段落、标题、引用块、列表项、代码块
- 新增 103 条测试，完整覆盖所有新增模块

#### AI Copilot 面板国际化 & UI 优化
- **i18n 完整覆盖** — AI Copilot 面板所有文本改为 `t()` 调用，支持中/英切换：
  - 面板标题、新建对话、设置、关闭、输入占位符、发送、使用提示
  - 新增 i18n 键：`aiCopilot.settings.testConnectionError`
- **消息布局重构** — 用户消息右侧气泡、AI 消息左侧气泡（含 Bot 图标 + 标签行），取消水平分隔线
- **FloatingPanel 可见性控制** — 幻灯片 / 思维导图 / 设置等视图模式下自动隐藏浮动面板
- **applyAction** 现通过 `t(aiCopilot.panel.applied)` 传递 i18n 标签

### Fixed

- 修复 Milkdown nodeviews：Mermaid 改用 Crepe renderPreview API（替换 MutationObserver）
- 修复 WikiLink：改用 Milkdown native Node schema + remark 插件（替换 DOM 后处理）
- 修复 LocalImage：移除 MutationObserver，改为内容触发式重处理
- 修复 FrontmatterView：改为 React 组件 + 内容剥离，避免 DOM 污染编辑区
- 修复 AI Copilot i18n 路径错误（`../../../i18n` → `../../../../i18n`）
- 修复 v0.8.0 未推送代码中若干代码审查问题

### Tech

- 新增依赖：`@milkdown/crepe`、`@milkdown/react`、`@milkdown/kit`
- 新增 TypeScript 类型：`src/types/edit.ts`（EditSession、EditRecord、InlineFormat 等）

---

### Added

#### Plugin System (全新功能)
- 插件系统核心基础设施：插件加载器、注册表、生命周期管理
- 插件面板 UI 及侧边栏入口按钮
- Commands API：插件可注册并调用编辑器命令
- Workspace API：插件可读写工作区状态
- Preview namespace：插件可扩展预览渲染行为
- Phase 3 安全沙箱：限制插件权限与资源访问
- Phase 4 官方内置插件支持
- Phase 5 社区插件生态：推荐插件列表与一键安装
- 插件激活流水线端到端打通（含 Tauri v2 plugin API 迁移）
- 插件卸载时自动移除侧边栏图标
- 每个插件面板使用独立的 Lucide 图标加以区分

#### Graph View
- 异步增量弹簧布局（Spring Layout via RAF），大图不再卡顿主线程

### Fixed

#### Plugin System
- 修复推荐插件 Tab 中安装功能不生效的问题
- 修复插件 ID 在注册表 / 运行时 / 默认配置之间不一致导致的加载失败
- 修复 P0 存储键不一致问题（C1），防止状态丢失
- 修复 P1 路径穿越风险（`create-plugin.js`）
- 通过 TDD 修复 8 个高危安全与正确性问题
- 修复 TypeScript 构建错误（PluginPanel 组件）
- 修复 `usePlugins` 迁移至 Tauri v2 plugin API 后的兼容性问题

### Refactored

- 拆分 PluginPanel 为多个子组件，增强可维护性
- 强化 Plugin API 类型定义，减少运行时错误
- 从 plugin entries 中移除重复的 Snippet Manager 入口（已在 Settings 中提供）

### Tests

- 修复 PluginPanel 测试套件（适配 Tauri stub 修复及键名重命名）
- 补全测试用例，修复全部失败测试

---

## [v0.7.2] - 2026-04-14

### Fixed

#### Settings UI
- Fixed keyboard shortcuts being intercepted in Custom CSS editor textarea (e.g., Ctrl+S, Ctrl+W now work normally in text input)
- Fixed Escape key closing Settings modal when focus is inside input/textarea fields
- Removed placeholder text from Custom CSS editor (now uses copy-friendly "Insert Example" button)

#### Custom CSS Editor UX
- Added "Insert Example" button to easily populate template CSS code
- Added visual feedback to "Apply" button (shows "✓ Applied" for 1.5 seconds after click)
- Improved user awareness of CSS application success

---

## [v0.7.1] - 2026-04-13

### Fixed

#### Git Panel Improvements
- Fixed stage/unstage operations in Rust backend (`git.rs`)
- Added title attributes to ActivityBar buttons for accessibility
- Fixed duplicate tab opening from git panel with cross-platform path normalization
- Added status badges (M/A/D/R/?) to distinguish staged vs unstaged files

#### Session Management
- Fixed welcome page sample.md being saved to session and reappearing on restart
- Only serialize tabs with actual file paths; exclude transient untitled tabs
- Skip untitled tabs from legacy session restore

#### Settings & Editor
- Improved auto-save delay selector with preset values (1s/2s/5s) and custom input
- Better UX for delay configuration

### Added

#### Test Coverage
- Added comprehensive tests for GitPanel component  
- Added useGit hook tests for git operations
- Added useTabs hook tests for session persistence and path normalization
- Added git-commands utility tests
- All tests passing: 956 tests across 73 test files (80%+ coverage)

#### Code Quality
- Cross-platform path comparison for tab deduplication
- Fixed mermaid/mindmap rendering
- Fixed html-export functionality

---

## [v0.7.0] - 2026-04-12

### Added

#### 幻灯片演示模式 (Slide Mode)
- **SlidePreview 组件** — 将 Markdown 按 `---` 分隔符（代码块内除外）解析为幻灯片页面：
  - 键盘导航：方向键 / Space / Home / End / Escape
  - 点击左右半区翻页
  - 全屏支持（最大化/还原图标）
  - 进度条与页码浮层
- **快捷键 `Ctrl+4`** — 一键切换幻灯片模式，工具栏同步新增演示按钮
- 按需懒加载，与 HelpModal 模式一致，不影响首屏性能

#### 自定义主题管理 (Custom Theme Management)
- **外部主题导入** — 设置 > Appearance > 通过文件选择器导入 JSON 主题：
  - 校验必填的 14 个 CSS 变量，缺失时报错
  - 安装后立即应用并持久化
- **主题架构重构**：
  - `theme-registry.ts` — 内置主题数据（杜绝循环依赖）
  - `theme-manager.ts` — 外部主题的加载 / 安装 / 删除逻辑
  - `theme-storage.ts` — 自定义主题 localStorage 持久化
- **折叠式 JSON 示例** — 设置面板展开查看 14 个 CSS 变量的完整格式

#### 自定义 CSS 注入 (Custom CSS Editor)
- **CustomCssEditor 组件** — 设置 > Appearance > 自定义 CSS 选项卡：
  - textarea 输入任意 CSS，实时注入全局 `<style>` 标签
  - Apply / Clear 按钮，Clear 同时移除已注入样式
  - 应用启动时自动读取并重新应用保存的 CSS
- `custom-css.ts` 工具模块：`getCustomCss / setCustomCss / clearCustomCss / applyCustomCss`

#### Git 集成 (Git Integration)
- **GitPanel 侧边栏** — 工具栏 `GitBranch` 按钮打开 Git 面板：
  - 当前分支与仓库路径显示
  - 变更文件勾选列表（staged / unstaged）
  - commit 输入框 + 提交按钮
  - Pull / Push 操作按钮
- **DiffViewer 组件** — 统一差异渲染，+/- 行着色
- **Rust 后端 `git.rs`** — 通过系统 `git` CLI 封装 6 个命令：
  `git_get_repo` / `git_get_status` / `git_diff` / `git_commit` / `git_pull` / `git_push`
- `git-commands.ts` — 类型化 Tauri invoke 封装，含前端入参校验
- `useGit` Hook — 管理 repo / branch / files / loading / error 响应式状态

#### 片段管理增强 (Snippet Enhancement)
- **工具栏片段按钮** — Library 图标按钮，位于数学公式（Σ）按钮之后，一键打开片段选择器
- **快捷键 `Ctrl+Shift+J`** — 触发片段选择器（可在设置中自定义）
- i18n 新增：`settings.shortcuts.insertSnippet`、`toolbar.insertSnippet`

#### 思维导图视图 (Mindmap View)
- **MindmapView 组件** — 将文档标题层级（H1–H6）渲染为 Mermaid mindmap：
  - 点击节点滚动至对应标题位置（含括号等特殊字符兼容）
  - `Ctrl+滚轮` 缩放（范围 0.3×–3×）
  - 通过独立递增 ID 避免并发渲染冲突
- **快捷键 `Ctrl+5`** — 工具栏按钮 + 命令面板入口三路触发
- 导出 `sanitizeText` 供 mindmap 节点匹配与标题跳转复用

#### Activity Bar
- **ActivityBar 组件** — VS Code 风格左侧活动栏：
  - 4 个面板图标（文件树 / 大纲 / 搜索 / Git）
  - 底部设置入口
  - 激活态高亮，点击可切换/折叠对应侧边栏

#### UX 体验改善
- **侧边栏关闭按钮** — TocSidebar 与 FileTreeSidebar 右上角新增 × 关闭按钮
- **侧边栏状态持久化** — 展开/折叠状态写入 localStorage（`marklite-show-toc` / `marklite-show-filetree`）
- **会话恢复** — 启动时自动恢复上次打开的标签页（`marklite-session-tabs`）
- **自动保存设置** — 设置 > 编辑器 新增：
  - 自动保存开关（默认关闭，`marklite-autosave`）
  - 延迟档位选择：1s / 2s / 5s / 自定义（`marklite-autosave-delay`）
- **未保存确认** — 关闭应用时若有未保存内容弹出确认对话框
- **单实例模式** — 集成 `tauri-plugin-single-instance`，双击打开文件时聚焦已有窗口而非新开实例
- **侧边栏快捷键** — `Alt+1` 切换文件树，`Alt+2` 切换大纲

#### 视觉统一
- **全局统一滚动条样式** — 将散落各处的 `::-webkit-scrollbar` 规则合并为统一全局规则块：
  - 宽度 6px、圆角、主题色填充、透明轨道
  - Firefox `scrollbar-width: thin` + `scrollbar-color` 全局覆盖
  - 编辑器 / 预览 / 文件树 / Git / TOC / 搜索面板及所有弹窗滚动条样式完全一致
  - 唯一例外：`tabbar-scroll` 保留隐藏滚动条行为

### Fixed
- 修复片段插入时替换整个文档的问题 — 改用 `selection.main.from/to` 定位光标，选区文本被片段内容替换
- 修复搜索面板清空关键词后仍显示旧结果的问题 — 清空时同时清除 `error` 与 `replaceMessage` 状态
- 修复思维导图节点含括号时点击跳转无效 — 改用 `sanitizeText` 比较原始标题
- 修复 `FileTreeSidebar` rename_file invoke 参数名与 Rust 端不匹配（camelCase → snake_case）
- 修复 `version-history` storageKey 路径碰撞 — 改用 `encodeURIComponent` 编码
- 修复 `App.handleCloseAllTabs` 使用 accumulator 模式（替换 break 逻辑）
- 修复窗口关闭监听器使用 `tabsRef` + async/await，避免 stale closure
- 修复 `useFileOps` 导出进度顺序（`prerenderExportAssets` 移至 60% 回调之前）
- 修复 `useTabs.markSavedAs` 未清除 `displayName`，导致标签标题不更新
- 修复 `slide-parser` fence 正则，现支持 `~~~{3,}` 代码块（与 `\`\`\`{3,}` 等价）
- 修复 `writing-stats` 在统计字数前未剥离 YAML frontmatter，导致元数据被计入字数

### Changed
- `useTabs` 暴露 `tabsRef`，供窗口关闭事件处理器读取最新 tab 状态
- `useTabs.notifyRecent` 包裹 `useCallback`，修正 `renameTab` 依赖数组
- `useLocalStorage` 新增 `useLocalStorageNumber` Hook
- Mermaid render ID 改为全局递增整数，避免并发渲染产生 ID 冲突
- 错误提示文本改用 i18n key + CSS 变量颜色渲染

### Tests
- 测试套件从 **775 个**（v0.6.0）增长至 **944 个用例**（73 个测试文件），新增/完善覆盖：
  - `ActivityBar.test.tsx` — 18 个用例，覆盖面板按钮、活动状态、设置入口
  - `MindmapView.test.tsx` — 7 个用例，覆盖渲染、缩放、节点跳转、CSS 变量
  - `mindmap-converter.test.ts` — 9 个用例，覆盖标题解析、缩进层级、特殊字符
  - `GitPanel.test.tsx` — 15 个用例，覆盖仓库状态、提交表单、pull/push 操作
  - `DiffViewer.test.tsx` — 6 个用例，覆盖 +/- 行渲染、空 diff
  - `useGit.test.ts` — 9 个用例，覆盖初始化、状态刷新、错误处理
  - `git-commands.test.ts` — 13 个用例，覆盖所有 invoke 封装与入参校验
  - `CustomCssEditor.test.tsx` — 7 个用例，覆盖 apply / clear / 持久化
  - `custom-css.test.ts` — 6 个用例，覆盖 get / set / clear / apply 工具函数
  - `SlidePreview.test.tsx` — 6 个用例，覆盖解析、翻页、全屏
  - `slide-parser.test.ts` — 13 个用例，覆盖 `---` 与 `~~~` fence 边界
  - `theme-manager.test.ts` — 9 个用例，覆盖安装 / 删除 / 校验
  - `ShortcutSettings.test.tsx` — 10 个用例，覆盖自定义快捷键 UI
  - `useTabs.test.ts` — 26 个用例（新增 `markSavedAs` / `tabsRef` / session restore）
  - `version-history.test.ts` — 18 个用例（新增 storageKey 碰撞防护）
  - `writing-stats.test.ts` — 18 个用例（新增 frontmatter 排除）

---

## [v0.6.0] - 2026-04-12

### Added

#### 工具栏增强 (F019)
- **扩展格式化按钮** — Toolbar 新增以下操作按钮：
  - 代码块 (`\`\`\`...```) — 一键插入围栏代码块，有选区时自动包裹
  - 分割线 (`---`) — 在光标所在行后插入水平分割线
  - 任务列表 (`- [ ]`) — 切换任务列表前缀，支持多行选区批量处理
  - 数学公式 (`$...$` / `$$...$$`) — 有选区时插入行内公式；无选区插入块级公式

- **表格尺寸选择器** — 点击工具栏表格按钮弹出 8×8 网格选择器：
  - 鼠标悬停高亮预览行列数
  - 点击单元格即时生成带表头的完整 Markdown 表格
  - 点击外部自动关闭选择器

- **标签页导航按钮** — Toolbar 中部新增上一个/下一个标签页箭头按钮：
  - 仅在打开 2 个及以上标签页时显示
  - 在首/末标签页时自动禁用对应方向按钮

#### 可访问性
- Toolbar 组件添加 `role="toolbar"` 与 `aria-label`
- 键盘方向键（← →）可在工具栏按钮间导航，从两端可循环跳转

### Changed
- `ToolbarButton` 提取为独立组件，封装三种变体（action / toggle / view）的悬浮与激活样式
- 工具栏标题 (heading) 操作行为调整为**循环升级**：H1→H2→…→H6→无前缀，与 GitHub 编辑体验一致

### Tests
- 测试套件从 700 个用例扩展至 **775 个**（59 个测试文件），新增/完善如下覆盖：
  - `Toolbar.test.tsx` — 从 9 个扩展到 38 个用例，覆盖所有格式化按钮、切换按钮、焦点模式、标签导航、键盘导航
  - `useFormatActions.test.ts` — 从 3 个扩展至 30 个用例，使用真实 CodeMirror EditorView 验证每种文档变换
  - `TableSizePicker.test.tsx` — 新建，10 个用例，覆盖渲染、悬停标签、选择回调、点击外部关闭、网格扩展
  - `useScrollSync.test.ts` — 从 3 个扩展至 6 个用例，增加真实 DOM 元素的滚动比例计算验证
  - `useImagePaste.test.ts` — 从 1 个扩展至 5 个用例，覆盖返回值结构与边界场景
  - `FileMenuDropdown.test.tsx` — 修复子菜单关闭测试（改为 `waitFor` 等待 150ms 超时）


## [v0.5.0] - 2026-04-11

### Added

#### 文档导航与模板 (F017)
- **Wiki-Link 导航** — `[[target]]` 语法支持文档间快速导航：
  - 单击或 Ctrl+Click 打开/创建链接文档
  - 自动识别同文件夹内已存在的文档
  - 支持创建新文档并立即打开
  - 链接高亮显示，提升文档发现性

- **命令面板** — `Ctrl+Shift+P` 快速命令执行：
  - 模糊搜索 20+ 核心操作
  - 最近命令优先排序
  - 支持导出、搜索、主题切换、快捷键查看等
  - 键盘长效交互（无需鼠标）

- **片段管理器** — 支持文本模板与变量替换：
  - 创建/编辑/删除片段模板
  - 支持动态变量：`${date}`、`${time}`、`${filename}`、`${cursor}`
  - 一键快速插入常用内容
  - 本地 localStorage 持久化（触碰存储空间限制时显示错误提示）

#### 编辑增强 (F018)
- **多光标编辑** — 协同编辑多个位置：
  - `Alt+D` 选中当前单词的所有出现
  - `Alt+Up` 在上一行添加光标
  - `Alt+Down` 在下一行添加光标
  - 支持并行输入和删除，提升编辑效率

#### 导出增强
- **EPUB 电子书导出** — 支持 EPUB2/EPUB3 格式输出：
  - 动态导入 `epub-gen` 库（按需加载）
  - 从 YAML Frontmatter 中提取电子书元数据（标题、作者、描述等）
  - 自动生成目录和页码
  - 支持嵌入图片和样式表

#### 帮助与文档
- **内置用户手册** — 工具栏 `?` 按钮打开帮助弹窗，内嵌完整 USER_GUIDE.md，提供可折叠 TOC 侧边栏和标题快速跳转

### Fixed
- 修复应用启动时的白屏闪烁问题（添加主题预渲染脚本，窗口初始隐藏直到主题加载完成）
- 修复 PDF 导出时页码和页眉/页脚位置错误（`NumberedPageDecorator` 参数顺序）
- 修复拼写检查性能问题（改用 useEffect 替代 updateListener，减少不必要的 DOM 更新）
- 修复片段保存时忽略返回值导致的静默失败（存储空间满时现在显示错误提示）
- 修复 Wiki-Link 路径在 Windows 上混用正反斜杠的问题（后端自动规范化）
- 修复 CRLF 换行符在某些导出格式中的处理
- 修复文件菜单（`FileMenuDropdown`）鼠标 hover 其他一级菜单项时二级子菜单未关闭的问题
- 修复 `extractLatexFormulas` 在 CRLF 换行文档中多行 `$$...$$` 数学块无法识别的问题（`trimStart()` → `trim()`）

### Changed
- 移除死代码 `isEpubAvailable()` 函数（始终返回 true，无实际用途）
- 移除生产代码中的 `console.warn` 语句（改为静默处理或返回值指示）
- 优化编辑器扩展依赖数组（移除 spellCheck/activeTabId，避免频繁重建）
- 更新片段哨兵占位符（`\x00` → Unicode `\uFFFD`，改进兼容性）
- 重构 `App.tsx`（约 1000 行 → 506 行）：按功能抽取 6 个专用 Hook（`useInputDialog`、`useDocMetrics`、`useVersionHistory`、`useTableEditor`、`useSnippetFlow`、`useEditorInstance`）及 `EditorContentArea` 布局组件
- 完善测试套件：45 个测试文件，562 个用例全部通过，为本次新增功能补充 7 个测试文件

### Security
- 添加 TypeScript 类型定义用于外部 `epub-gen` 包（`src/types/epub-gen.d.ts`）
- 增强错误处理与用户反馈对话

---

## [v0.4.0] - 2026-04-10

### Added

#### 编辑增强 (F014)
- **图片粘贴与拖拽** — 支持从剪贴板粘贴 PNG/JPG/GIF/WebP，或拖拽图片文件到编辑器，自动保存到本地 `assets/images/` 并插入 Markdown 引用
- **Toolbar 格式化按钮** — 新增编辑器工具栏操作：
  - 文本格式：加粗、斜体、删除线、行内代码
  - 块级：标题、引用、有序/无序列表
  - 插入：链接、图片
- **右键上下文菜单** — 编辑器内右键显示上下文感知菜单（20+项操作）：
  - 通用：剪切、复制、粘贴、全选
  - 上下文判断：不同内容类型（标题、代码块、表格等）展示对应操作
  - 表格操作：行列增删、对齐调整
  - 列表操作：缩进、反缩进、列表类型切换
- **脚注支持** — `remark-footnotes` 集成，支持 `[^1]` 脚注定义和引用，预览中自动渲染为链接
- **YAML Frontmatter** — `remark-frontmatter` 支持，编辑器高亮 frontmatter 块，预览中显示为表格

#### 文件管理 (F016)
- **文件树侧边栏** — 打开文件夹后显示左侧文件树，支持：
  - 文件筛选（仅显示 .md / .markdown / .txt）
  - 双击打开文件
  - 上级/刷新/选择文件夹按钮
  - 懒加载子目录
- **文件树 CRUD 操作** — 在文件树中直接新建、删除、重命名文件
- **文件树搜索过滤** — 文件树顶部搜索框，实时过滤文件名
- **跨文件全文搜索** — 工具栏新增搜索按钮，右侧弹出搜索面板，支持：
  - 正则表达式搜索
  - 大小写敏感选项
  - 最多 200 条结果展示
  - 点击跳转到匹配行
  - 未保存标签页内容的搜索与替换
- **表格可视化编辑** — 点击表格打开编辑对话框，支持：
  - 行列增删（带快捷按钮）
  - 单元格内容编辑
  - 对齐方式调整（左/中/右）
- **大纲扩展** — H4-H6 支持，大纲侧边栏现支持所有 H1-H6 标题

#### UI 增强 (F015)
- **深色主题系统跟随** — 三种主题模式：
  - `system`（默认）— 跟随操作系统深色模式
  - `light` — 强制亮色
  - `dark` — 强制暗色
  - 主题偏好持久化到 localStorage
- **额外主题** — 新增 Sepia（护眼棕）和 High-Contrast（高对比度）CodeMirror 编辑器主题
- **统一主题系统** — 合并 App Theme 和 Preview Theme 为单一主题系统，全局一致
- **写作统计面板** — 状态栏右侧展示：
  - 字数/字符数/句子数
  - 预计阅读时间（350 字词/分钟）
  - 实时更新
- **设置面板** — 综合设置弹窗，统一管理所有偏好：
  - 主题选择、语言切换、Vim 模式
  - 自动保存、拼写检查、分栏比例
  - 快捷键设置标签页
- **欢迎页** — 空标签页启动屏，显示快速操作入口和快捷键提示
- **VS Code 风格标签页导航** — 工具栏添加前进/后退标签页按钮
- **文件菜单下拉** — UI 重构为下拉式文件菜单，操作更直观

#### 导出增强
- **导出 PNG** — 新增 PNG 图片导出功能（基于 html2canvas）
- **DOCX/PDF 导出增强** — 改进 Mermaid 图表预渲染为图片、数学公式渲染、Emoji 修复

#### 国际化 (i18n)
- **中英文双语** — 完整国际化覆盖，所有 UI 文本支持中/英切换
- **搜索面板 i18n** — 搜索面板所有文本国际化

#### 快捷键
- **自定义快捷键** — 支持用户自定义键盘快捷键绑定

### Fixed
- 修复 `toggleLinePrefix` API 不一致问题（返回值语义统一）
- 修复文件树子节点展开状态丢失 bug
- 修复文件树重命名按 Enter 键无效的问题
- 修复文件树重命名后文件名未刷新显示的问题
- 修复文件树 rootPath 在隐藏/显示时丢失的问题
- 修复编辑器主题切换异常
- 修复 Mermaid 流程图在 Windows CRLF 换行符下渲染失败
- 修复 Mermaid SVG CSS 被 Markdown 解析器破坏的问题
- 修复 SVG foreignObject 导致 canvas 导出 taint 错误
- 修复搜索面板定位和 Enter 键触发不一致
- 修复跨文件替换对未保存标签页的处理
- 修复 DOCX/PDF 导出时 Tauri 2 invoke camelCase 参数问题
- 修复默认文件名改为 sample.md 及重复名称处理
- 修复多个 Tab 激活、UI 一致性和 i18n 支持问题
- 移除编辑器和文件操作中的 `console.error` 调用，改为静默处理
- 移除死代码 `containerRef` 声明
- 解决构建错误（排除测试文件）

### Improved
- 提升用户体验：右键菜单支持 viewport 边界防溢出
- 增强类型守卫：修正图片粘贴中的条件判断逻辑
- 测试重组至 `__tests__` 目录，100% 通过率
- UI 细节修复：菜单配色/图标/主题适配优化

---

## [v0.3.0] - 2026-04-09

### Changed

- 应用更名为 MarkLite（原 md-client）
- 版本升至 v0.3.0
- 更新所有配置文件、文档及 localStorage 键名前缀


## [v0.2.0] - 2026-04-09


### Fixed

- 文件路径访问与相对路径支持的完整实现 (`0f8c7aa`)
- 修复多个UI交互和主题问题 (`d4d6d84`)



### Docs

- 重命名用户手册为英文文件名 (`12b905a`)
- 更新 README 添加截图展示和用户手册链接 (`29a7c98`)
- 更新 TDD_TRACKER 至 v0.2.0 (第二梯队全部完成) (`6e1835f`)



### Added

- add auto-close brackets for Markdown editing (`2d09e52`)
- add find and replace with regex support (`d3e9dc7`)
- add Vim key binding support (`4f8025b`)
- add auto-save with debounce (1s delay) (`730b888`)
- add auto-save, HTML export, and word count (`8ce5020`)
- add HTML export functionality (`dc7af6e`)
- LaTeX 数学公式渲染 (remark-math + rehype-katex) (`a2ed864`, `d2d1b6f`)
- Mermaid 图表渲染 (`91b763e`)
- 打字机/专注/全屏模式 (`9f079cc`)
- 大纲导航侧边栏 (`ab5dee9`)
- 深色模式 + 主题切换 (`8df9ebe`)
- 版本历史（本地快照） (`bf84239`)


### Changed

- add git-chglog configuration and documentation (`a13ac82`)







## [v0.1.1] - 2026-04-08


### Fixed

- 修复DOCX导出时表格表头丢失的问题 (`71aff60`)
- 修复PDF导出时表格丢失的问题 (`21cc48b`)



### Changed

- bump version to 0.1.1 (`c5e70a8`)



### Added

- add PDF and DOCX export functionality (`bebbf35`)
- open file passed via CLI argument on app launch (`bb5bfca`)
- add tab scroll arrows and hide scrollbar on tab bar (`2a1c7cf`)







## [v0.1.0] - 2026-04-07


### Fixed

- add fs write permission for save/save-as functionality (`03dd02d`)



### Performance

- split vendor chunks and suppress chunk size warning (`48092d1`)



### Added

- initial release of MarkLite v0.1.0 (`474ad7c`)







