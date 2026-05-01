# MarkLite++ 代码映射索引

**最后更新** — 2026-05-01
**版本** — v0.10.6 (当前)
**项目** — MarkLite 桌面 Markdown 编辑器（Tauri 2 + React 19 + CodeMirror 6）

---

## 📚 文档概览

本目录包含 MarkLite 项目的架构和代码映射文档：

| 文档 | 描述 |
|------|------|
| [frontend.md](frontend.md) | React 前端架构、组件、状态管理、路由（待生成） |
| [backend.md](backend.md) | Tauri Rust 后端、导出引擎、文件系统、IPC（待生成） |
| [integrations.md](integrations.md) | 外部依赖、插件、数据源、第三方服务（待生成） |

---

## 🏗️ 项目结构

```
md-client/
├── src/                          # React 前端源代码
│   ├── App.tsx                  # 主应用组件 + 状态管理
│   ├── components/              # React 组件库
│   │   ├── CommandPalette.tsx   # 命令面板（Ctrl+Shift+P）
│   │   ├── SnippetManager.tsx   # 片段管理器
│   │   ├── FileMenuDropdown.tsx # 文件菜单
│   │   ├── Toolbar.tsx          # 工具栏（含格式化、切换、标签导航）
│   │   ├── ToolbarButton.tsx    # 工具栏通用按钮（action/toggle/view 变体）
│   │   ├── TableSizePicker.tsx  # 表格尺寸网格选择器
│   │   ├── SearchPanel.tsx      # 搜索面板
│   │   └── ...                  # 其他组件
│   ├── lib/                     # 工具函数和业务逻辑
│   │   ├── snippets.ts          # 片段持久化
│   │   ├── html-export.ts       # HTML/EPUB 导出
│   │   ├── multicursor-keymap.ts # 多光标快捷键
│   │   ├── remark-wikilinks.ts  # Wiki-link 解析
│   │   └── ...                  # 其他工具
│   ├── hooks/                   # 自定义 React Hooks
│   ├── types/                   # TypeScript 类型定义
│   ├── i18n/                    # 国际化资源
│   └── app.css                  # 全局样式（Tailwind）
│
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── lib.rs               # Tauri 命令导出
│   │   ├── export_pdf.rs        # PDF 导出渲染
│   │   ├── export_docx.rs       # DOCX 导出渲染
│   │   └── markdown_preprocess.rs # Markdown 预处理
│   └── Cargo.toml               # Rust 依赖配置
│
├── docs/                         # 文档
│   ├── guides/                  # 用户与开发指南
│   │   ├── USER_GUIDE.md        # 用户手册
│   │   ├── PLUGIN_DEV.md        # 插件开发指南
│   │   ├── FEATURE_COMPARISON.md # 功能对比
│   │   └── VERSION_BUMP.md      # 版本发布指南
│   ├── CODEMAPS/                # 代码映射（本目录）
│   └── assets/                  # 文档资源
│       └── screenshot.png       # 界面截图
│
├── public/                       # 静态资源
├── CHANGELOG.md                 # 版本历史（已更新 v0.6.0）
├── README.md                    # 项目首页（已更新）
├── package.json                 # Node.js 依赖
├── tauri.conf.json              # Tauri 配置
└── tsconfig.json                # TypeScript 配置
```

---

## 🎯 核心模块速览

### 前端架构

**状态管理** — src/App.tsx
- 文件和标签页状态
- 编辑器配置（主题、语言、Vim 模式）
- 导出进度
- 搜索/替换状态

**编辑库集成** — CodeMirror 6 + @uiw/react-codemirror
- 扩展：自动补全、代码折叠、Vim 模式、多光标
- 自定义快捷键映射
- 拼写检查集成（性能优化：useEffect 替代 updateListener）

**组件体系**
- 命令面板：模糊搜索，最近命令优先
- 片段管理器：变量替换（${date}、${cursor} 等）
- Wiki-link 导航：同文件夹内文档快速链接
- 多光标编辑：Alt+D、Alt+Up/Down 快捷键

### 后端架构

**导出引擎** — Rust + printpdf/docx-rs
- PDF 导出：带页码和页眉/页脚的渲染
- DOCX 导出：表格、图表、公式支持
- Markdown 预处理：frontmatter 提取、图片处理

**IPC 通信** — Tauri 命令 (camelCase)
- `exportPdf` / `exportDocx` / `exportEpub`
- `getOpenFile` — 命令行集成
- `readFile` / `writeFile` — 文件系统访问

---

## 🔄 数据流

### 编辑 → 导出流程

```
编辑器输入 
  → Markdown 内容
    → Frontmatter 提取
      → 图片处理
        → Tauri invoke exportPdf()
          → PDF 渲染（Rust）
            → 文件保存
```

### Wiki-Link 导航流程

```
输入 [[document]]
  → 解析 wiki 链接 (remark-wikilinks)
    → 点击触发
      → 检查文档是否存在
        → 存在：打开标签页
        → 不存在：创建新文档
          → 打开新文档
```

### 片段插入流程

```
选择片段
  → 获取片段模板
    → 替换 ${variables}
      → 插入到编辑器
        → 光标定位到 ${cursor}
```

---

## 📦 主要依赖

### 前端
- **react** 19.0.0 — UI 框架
- **@codemirror/\*** — 编辑器库
- **react-markdown** — Markdown 渲染
- **remark-gfm** / **remark-math** / **rehype-katex** — 扩展
- **mermaid** — 图表渲染
- **tailwindcss** 4 — 样式系统
- **lucide-react** — 图标库
- **epub-gen** 0.1.0（动态导入）— EPUB 生成

### 后端
- **tauri** 2 — 桌面应用框架
- **printpdf** — PDF 生成
- **docx-rs** — DOCX 生成
- **regex** — 文本处理

---

## 🚀 新增特性（v0.6.0）

| 特性 | 文件 | 描述 |
|------|------|------|
| 表格尺寸选择器 | src/components/TableSizePicker.tsx | 8×8 网格弹出层，鼠标悬停选择表格大小 |
| 工具栏扩展按钮 | src/components/Toolbar.tsx | 代码块、分割线、任务列表、数学公式按钮 |
| 标签导航按钮 | src/components/Toolbar.tsx | 工具栏中部的上一个/下一个标签页按钮 |
| ToolbarButton 组件 | src/components/ToolbarButton.tsx | 提取为独立组件，封装三种变体样式 |
| 测试套件扩展 | src/__tests__/ | 700 → 775 个测试用例，59 个测试文件 |

## 🚀 新增特性（v0.5.0）

| 特性 | 文件 | 描述 |
|------|------|------|
| Wiki-Link | src/lib/remark-wikilinks.ts | `[[target]]` 文档导航 |
| 命令面板 | src/components/CommandPalette.tsx | Ctrl+Shift+P 快速命令 |
| 片段管理器 | src/components/SnippetManager.tsx | 文本模板与变量替换 |
| 多光标编辑 | src/lib/multicursor-keymap.ts | Alt+D/Up/Down 快捷键 |
| EPUB 导出 | src/lib/html-export.ts | EPUB2/EPUB3 电子书格式 |
| i18n 扩展 | src/i18n/ | 新增 snippet.saveFailed 等 |

---

## 🐛 最近修复（v0.6.0）

- ✅ 修复 FileMenuDropdown 子菜单关闭测试（`waitFor` 等待 150ms 超时触发）
- ✅ 工具栏键盘导航：非方向键不再触发焦点移动

## 🐛 最近修复（v0.5.0）

- ✅ PDF 页码/页眉/页脚渲染（export_pdf.rs 参数顺序修复）
- ✅ 拼写检查性能（改用 useEffect，减少 DOM 更新）
- ✅ 片段保存失败处理（saveSnippets 返回值检查）
- ✅ CRLF 换行符兼容性
- ✅ 移除死代码 `isEpubAvailable()`
- ✅ 移除 console.warn 语句
- ✅ 优化编辑器扩展依赖数组

---

## 📖 文档导航

- **用户指南** — [USER_GUIDE.md](../guides/USER_GUIDE.md) — 功能教程、快捷键、常见问题
- **维护日志** — [CHANGELOG.md](../../CHANGELOG.md) — 版本历史
- **项目首页** — [README.md](../../README.md) — 功能总览、技术栈

---

## 🔗 便捷链接

- **GitHub（主仓库）** — https://github.com/lin51kevin/md-client
- **问题反馈** — https://github.com/lin51kevin/md-client/issues
- **功能建议** — https://github.com/lin51kevin/md-client/discussions

---

**提示**：更详细的代码映射（frontend.md、backend.md、integrations.md）可通过遍历源代码目录树和依赖图生成。
