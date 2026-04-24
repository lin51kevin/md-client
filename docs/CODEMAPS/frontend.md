# MarkLite 前端代码映射

**最后更新**：2026-04-24 | **版本** — v0.10.4 (当前)

---

## 📐 前端架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React 19 应用（App.tsx）                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      UI 层（TitleBar/Toolbar）                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│   ↑                                                              ↑  │
│   │ 菜单/格式化操作                          导出/设置             │  │
│   │                                                              │  │
│  ┌─────────────────────┬──────────────────────────────────────┐ │  │
│  │ 文件树侧边栏        │     编辑器主区域                      │ │  │
│  │ FileTreeSidebar     │  EditorContentArea (分屏管理)         │ │  │
│  │                     │    ├─ CodeMirror 6 (左侧编辑器)       │ │  │
│  │ • CRUD操作          │    │  • 语法高亮                      │ │  │
│  │ • 搜索过滤          │    │  • 自动补全                      │ │  │
│  │ • 懒加载            │    │  • VIM 模式                      │ │  │
│  │ • 拖拽              │    │  • 多光标编辑                    │ │  │
│  │                     │    ├─ MarkdownPreview (右侧预览)     │ │  │
│  │                     │    │  • GFM 渲染                      │ │  │
│  │                     │    │  • KaTeX 公式                    │ │  │
│  │                     │    │  • Mermaid 图表                  │ │  │
│  │                     │    │  • WikiLink 导航                 │ │  │
│  │                     │    └─ 分屏切换（react-split）        │ │  │
│  └─────────────────────┼──────────────────────────────────────┘ │  │
│                        │                                        │  │
│  ┌─────────────────────┴──────────────────────────────────────┐ │  │
│  │           TabBar（多标签页/拖拽排序/右键菜单）              │ │  │
│  └─────────────────────────────────────────────────────────────┘ │  │
│   ↑                                                              ↑  │
│   │ 标签操作                                    标签导航           │  │
│   │                                                              │  │
│  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │        StatusBar（字数/光标/版本历史/专注模式）              │ │  │
│  └─────────────────────────────────────────────────────────────┘ │  │
│                                                                   │  │
│  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │         全局对话框（导出/搜索/替换/设置/命令面板）            │ │  │
│  └─────────────────────────────────────────────────────────────┘ │  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 核心组件清单

### 主布局组件

| 组件 | 文件 | 职责 | 关键功能 |
|------|------|------|--------|
| **App** | `App.tsx` (506行) | 主应用容器，全局状态管理 | 标签管理、焦点模式、主题、国际化 |
| **EditorContentArea** | `components/EditorContentArea.tsx` | 编辑区布局管理 | 分屏模式切换、编辑/预览同步 |
| **TabBar** | `components/TabBar.tsx` | 多标签页管理 | 打开/关闭/切换/拖拽/右键菜单 |
| **Toolbar** | `components/Toolbar.tsx` (306行) | 工具栏 | 文件菜单/格式化/切换/标签导航 |
| **StatusBar** | `components/StatusBar.tsx` | 底部状态栏 | 字数统计/光标位置/版本历史 |
| **ActivityBar** | `components/ActivityBar.tsx` | 左侧活动栏 | 视图切换/侧边栏菜单 |

### 编辑器组件

| 组件 | 文件 | 职责 |
|------|------|------|
| **CodeMirrorEditor** | `components/CodeMirrorEditor.tsx` | CM6 实例管理、主题/语言切换 |
| **MarkdownPreview** | `components/MarkdownPreview.tsx` | react-markdown 预览渲染 |
| **TableEditor** | `components/TableEditor.tsx` | 表格可视化编辑对话框 |
| **SearchPanel** | `components/SearchPanel.tsx` | 跨文件全文搜索面板 |
| **FindReplaceBar** | `components/FindReplaceBar.tsx` | 编辑器查找替换 |

### 侧边栏组件

| 组件 | 文件 | 职责 |
|------|------|------|
| **FileTreeSidebar** | `components/FileTreeSidebar.tsx` | 文件树主容器 |
| **FileTreeNode** | `components/FileTreeNode.tsx` | 单个树节点（递归） |
| **TocSidebar** | `components/TocSidebar.tsx` | 大纲导航侧边栏 |
| **GitPanel** | `components/GitPanel.tsx` | Git 导出与版本信息 |
| **MindmapView** | `components/MindmapView.tsx` | 思维导图预览 |

### 菜单与对话框

| 组件 | 文件 | 职责 |
|------|------|------|
| **FileMenuDropdown** | `components/FileMenuDropdown.tsx` | 文件操作菜单 |
| **EditorContextMenu** | `components/EditorContextMenu.tsx` | 编辑器右键菜单 (20+ 项) |
| **FileTreeContextMenu** | `components/FileTreeContextMenu.tsx` | 文件树右键菜单 |
| **TabContextMenu** | `components/TabContextMenu.tsx` | 标签页右键菜单 |
| **SettingsModal** | `components/SettingsModal.tsx` | 设置面板 |
| **CommandPalette** | `components/CommandPalette.tsx` | 快速命令面板 |
| **SnippetManager** | `components/SnippetManager.tsx` | 片段管理器 |
| **HelpModal** | `components/HelpModal.tsx` | 内置用户手册 |
| **InputDialog** | `components/InputDialog.tsx` | 通用输入对话框 |
| **ExportSettings** | `components/ExportSettings.tsx` | 导出选项对话框 |

### 工具组件

| 组件 | 文件 | 职责 |
|------|------|------|
| **ToolbarButton** | `components/ToolbarButton.tsx` | 工具栏通用按钮 (action/toggle/view) |
| **TableSizePicker** | `components/TableSizePicker.tsx` | 表格尺寸网格选择器 (8×8) |
| **DragOverlay** | `components/DragOverlay.tsx` | 拖拽覆盖层提示 |
| **DiffViewer** | `components/DiffViewer.tsx` | 版本比较查看器 |
| **WelcomePage** | `components/WelcomePage.tsx` | 欢迎页 |
| **CustomCssEditor** | `components/CustomCssEditor.tsx` | 自定义 CSS 编辑器 |

---

## 🪝 自定义 Hooks 系统

### 状态管理类 Hooks

| Hook | 文件 | 职责 |
|------|------|------|
| **useTabs** | `hooks/useTabs.ts` (120行) | 标签页状态、打开/关闭/切换/排序 |
| **useLocalStorage** | `hooks/useLocalStorage.ts` | localStorage 持久化 |
| **useSearchLogic** | `hooks/useSearchLogic.ts` | 搜索状态与逻辑 |
| **useSnippetFlow** | `hooks/useSnippetFlow.ts` | 片段管理状态 |

### 编辑器类 Hooks

| Hook | 文件 | 职责 |
|------|------|------|
| **useEditorInstance** | `hooks/useEditorInstance.ts` | CodeMirror 实例管理 |
| **useFormatActions** | `hooks/useFormatActions.ts` (200行) | 30+ 格式化操作集合 |
| **useImagePaste** | `hooks/useImagePaste.ts` | 图片粘贴/拖拽处理 |
| **useKeyboardShortcuts** | `hooks/useKeyboardShortcuts.ts` | 快捷键绑定系统 |
| **useSearchHighlight** | `hooks/useSearchHighlight.ts` | 搜索高亮装饰 |
| **useCursorPosition** | `hooks/useCursorPosition.ts` | 光标位置追踪 |
| **useEditorContextActions** | `hooks/useEditorContextActions.ts` | 右键菜单操作 |
| **useTableEditor** | `hooks/useTableEditor.ts` | 表格编辑逻辑 |

### 文件与构建类 Hooks

| Hook | 文件 | 职责 |
|------|------|------|
| **useFileOps** | `hooks/useFileOps.ts` (150行) | 文件打开/保存/导出（Tauri IPC） |
| **useDragDrop** | `hooks/useDragDrop.ts` | 拖拽排序逻辑 |
| **useGit** | `hooks/useGit.ts` | Git 操作与状态 |
| **useWindowInit** | `hooks/useWindowInit.ts` | 应用初始化与窗口事件 |
| **useWelcome** | `hooks/useWelcome.ts` | 欢迎页逻辑 |

### 视图与交互类 Hooks

| Hook | 文件 | 职责 |
|------|------|------|
| **useFocusMode** | `hooks/useFocusMode.ts` | 打字机/专注/全屏模式 |
| **useScrollSync** | `hooks/useScrollSync.ts` (80行) | 编辑/预览滚动同步 |
| **useDocMetrics** | `hooks/useDocMetrics.ts` | 字数/字符数/句子数统计 |
| **useInputDialog** | `hooks/useInputDialog.ts` | 输入对话框状态管理 |
| **useVersionHistory** | `hooks/useVersionHistory.ts` | 版本快照状态 |

---

## 📚 工具库模块

### 编辑器工具库

| 模块 | 文件 | 功能 |
|------|------|------|
| **commands** | `lib/commands.ts` (180行) | 20+ 快速命令定义与搜索 |
| **command-registry** | `lib/command-registry.ts` | 命令注册表 |
| **autocomplete** | `lib/autocomplete.ts` | 自定义自动补全源 |
| **cmAutocomplete** | `lib/cmAutocomplete.ts` | CM6 自动补全扩展集成 |
| **cmVim** | `lib/cmVim.ts` | VIM 模式键绑定 |
| **cm-themes** | `lib/cm-themes.ts` | 四种 CodeMirror 主题 |

### 导出与渲染

| 模块 | 文件 | 功能 |
|------|------|------|
| **export-prerender** | `lib/export-prerender.ts` (280行) | Mermaid/LaTeX 预渲染为 PNG base64 |
| **html-export** | `lib/html-export.ts` (400行) | HTML 独立文件导出 |
| **markdown-extensions** | `lib/markdown-extensions.ts` | remark/rehype 插件链配置 |
| **latex** | `lib/latex.ts` | KaTeX 拦截与公式提取 |
| **mermaid** | `lib/mermaid.ts` | Mermaid 初始化与渲染 |

### 文件与编辑

| 模块 | 文件 | 功能 |
|------|------|------|
| **context-menu** | `lib/context-menu.ts` (150行) | 右键菜单操作定义 |
| **custom-css** | `lib/custom-css.ts` | 用户 CSS 注入 |
| **git-commands** | `lib/git-commands.ts` | Git 操作封装 |
| **mindmap-converter** | `lib/mindmap-converter.ts` | Markdown → 思维导图转换 |
| **multicursor-keymap** | `lib/multicursor-keymap.ts` | Alt+D/Up/Down 多光标 |
| **vim-mode** | `lib/vim-mode.ts` | VIM 模式切换 |
| **version-history** | `lib/version-history.ts` | 本地快照管理 |

### 业务逻辑

| 模块 | 文件 | 功能 |
|------|------|------|
| **auto-save** | `lib/auto-save.ts` | 防抖自动保存 (500ms) |
| **word-count** | `lib/word-count.ts` | 字数/字符数/句子数算法 |
| **writing-stats** | `lib/writing-stats.ts` | 阅读时间与统计计算 |
| **remark-wikilinks** | `lib/remark-wikilinks.ts` | `[[target]]` 语法解析 |

---

## 🔌 关键数据结构

### Tab 结构

```typescript
interface Tab {
  id: string                    // 唯一标识 (UUID)
  path: string                  // 文件路径
  content: string               // 编辑器内容
  dirty: boolean                // 是否修改未保存
  cursorPos: EditorSelection    // 光标位置
  viewportTop: number           // 视口滚动位置
  language?: string             // 代码语言
  snapshot?: VersionSnapshot[]  // 版本快照
}
```

### Command 结构

```typescript
interface Command {
  id: string
  label: { zh: string; en: string }
  category: string
  keybinding?: string
  icon?: React.ReactNode
  action: (context: CommandContext) => Promise<void>
}
```

### 搜索结果

```typescript
interface SearchResult {
  path: string
  line: number
  column: number
  text: string
  matches: Array<{ start: number; end: number }>
}
```

---

## 🎨 主题系统

### CSS 变量架构

```css
/* 深色主题 */
--bg-primary: #1e1e1e
--bg-secondary: #252526
--text-primary: #e0e0e0
--text-secondary: #b0b0b0
--accent-color: #007acc

/* 浅色主题 */
--bg-primary: #ffffff
--bg-secondary: #f3f3f3
--text-primary: #333333
--accent-color: #0969da
```

### 主题对应

- **Light** — GitHub Light 亮色
- **Dark** — GitHub Dark 深色
- **Sepia** — 护眼棕色调
- **High Contrast** — 高对比度

---

## 📊 状态流向

```
用户操作 (点击/键入) 
    ↓
组件事件处理器
    ↓
状态更新 (useTabs / useState)
    ↓
副作用触发 (useEffect)
    ↓
自动保存 / 文件操作 (invoke Tauri)
    ↓
后端 Rust 处理
    ↓
文件系统 / 返回结果
```

---

## 🧪 测试覆盖

| 模块 | 测试用例 | 覆盖率 |
|------|----------|--------|
| Toolbar | 38 个 | 100% |
| useFormatActions | 30 个 | 100% |
| TableSizePicker | 10 个 | 100% |
| FileTreeSidebar | 25 个 | 95% |
| CommandPalette | 20 个 | 90% |
| **总计** | **775 个** | **92%** |

---

## 📈 性能优化

- **代码分割**：Vite 自动分割 vendor chunks
- **懒加载**：`epub-gen` 库按需动态导入
- **缓存**：LocalStorage 缓存主题/快捷键/片段
- **防抖**：自动保存 500ms 防抖，滚动同步 debouce
- **虚拟化**：文件树大目录使用懒加载（待优化）

---

## 🔄 更新流程（v0.6.0 新增）

### Toolbar 格式化按钮扩展
- 代码块、分割线、任务列表、数学公式一键插入
- 标题循环升级 (H1→H2→…→H6→无)

### 表格尺寸选择器
- 8×8 网格悬停预览
- 自动生成带表头的 Markdown 表格

### 标签页导航按钮
- 前进/后退箭头，2+ 标签页时显示
- 首/末标签页自动禁用对应按钮

### 无障碍改进
- Toolbar `role="toolbar"` 与 `aria-label`
- 键盘方向键循环导航工具栏按钮
