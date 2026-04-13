# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [v0.7.0] - 2026-04-13

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







