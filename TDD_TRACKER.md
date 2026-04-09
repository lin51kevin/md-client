# md-client 功能开发追踪

> 采用 TDD 工作流，每完成一个功能 → 审核 → 记录 checkpoint → 再进入下一个
> **禁止推送到远程仓库**

## 当前版本: v0.2.0 (dev)

---

## 第一梯队（P0 — 依赖已装，快速接入）

- [x] **F001** — 自动补全（括号/链接/Markdown语法） ✅ `2d09e52`
- [x] **F002** — 全局搜索替换（Ctrl+F / Ctrl+H） ✅ `d3e9dc7`
- [x] **F003** — Vim 键位绑定 ✅ `4f8025b`
- [x] **F004** — 自动保存（debounce 1s） ✅ `checkpoint`
- [x] **F005** — 导出 HTML ✅ `checkpoint`
- [x] **F006** — 实时字数统计 ✅ `checkpoint`

## 第二梯队（P1 — 1-2周）

- [x] **F007** — LaTeX 数学公式渲染 ✅
- [x] **F008** — Mermaid 图表渲染 ✅
- [x] **F009** — 打字机/专注/全屏模式 ✅
- [x] **F010** — 大纲导航侧边栏 ✅
- [x] **F011** — 深色模式 + 主题切换 ✅
- [x] **F012** — 版本历史（本地快照） ✅

---

## Checkpoint 日志

### F001 — 自动补全 — ✅ — 2026-04-08 22:59
- **测试**：18/18 ✅ | **TS**：✅ 零错误
- **审核**：通过。核心逻辑独立，inputHandler 集成
- **文件**：`autocomplete.ts` / `cmAutocomplete.ts` / `autocomplete.test.ts` / `App.tsx`

### F002 — 搜索替换 — ✅ — 2026-04-08 23:06
- **测试**：17/17 ✅ | **TS**：✅ 零错误
- **审核**：通过。纯函数算法 + 完整 UI 组件
- **文件**：`search.ts` / `search.test.ts` / `FindReplaceBar.tsx` / `App.tsx` / `useKeyboardShortcuts.ts`

### F003 — Vim 键位绑定 — ✅ — 2026-04-08 23:41
- **测试**：15/15 ✅ | **TS**：✅ 零错误
- **审核**：通过。VimModeManager 状态机 + @replit/codemirror-vim 异步加载
- **文件**：`vim-mode.ts` / `vim-mode.test.ts` / `cmVim.ts` / `App.tsx`
- **备注**：Vim 扩展动态 import，不影响首包体积

### F004 — 自动保存 — ✅ — 2026-04-09 06:05
- **测试**：7/7 ✅ | **TS**：✅ 零错误
- **审核**：通过。createAutoSave 管理器 + App.tsx 集成（per-tab 实例 + doc change 触发 schedule）
- **文件**：`auto-save.ts` / `auto-save.test.ts` / `App.tsx`

### F005 — 导出 HTML — ✅ — 2026-04-09 06:05
- **测试**：19/19 ✅ | **TS**：✅ 零错误
- **审核**：通过。unified 管道 Markdown→HTML + 完整文档外壳（含默认 GitHub 风格 CSS）
- **文件**：`html-export.ts` / `html-export.test.ts` / `useFileOps.ts` / `Toolbar.tsx` / `App.tsx`
- **备注**：HTML 导出纯前端实现，无需 Rust 后端；支持自定义标题和 CSS 注入

### F006 — 实时字数统计 — ✅ — 2026-04-09 06:52
- **测试**：16/16 ✅ | **TS**：✅ 零错误
- **审核**：通过。纯函数字数/字符/段落/阅读时间统计；中英文混合支持；CJK 标点排除；Markdown 剥离后统计（代码块内容保留）
- **文件**：`word-count.ts` / `word-count.test.ts`

### F007 — LaTeX 数学公式渲染 — ✅ — 2026-04-09 09:08
- **测试**：7/7 ✅ | **TS**：✅ 零错误
- **审核**：通过。remark-math + rehype-katex 管线已在 MarkdownPreview 中集成
- **文件**：`latex.ts` / `latex.test.ts` / `MarkdownPreview.tsx` / `App.css`
- **备注**：行内 `$...$` 和块级 `$$...$$` 均支持；KaTeX CSS 已引入

### F008 — Mermaid 图表渲染 — ✅ — 2026-04-09 09:14
- **测试**：6/6 ✅ | **TS**：✅ 零错误
- **审核**：通过。renderMermaid() 异步渲染 SVG → 替换代码块；MarkdownPreview 集成防抖 200ms
- **文件**：`mermaid.ts` / `mermaid.test.ts` / `MarkdownPreview.tsx` / `App.css`
- **备注**：渲染失败时显示红色错误提示；修复了 resetMermaidInit 导出

### F009 — 打字机/专注/全屏模式 — ✅ — 2026-04-09 09:21
- **测试**：（UI 功能，hook 层无独立测试）| **TS**：✅ 零错误
- **审核**：通过。useFocusMode hook 管理 4 种模式（normal/typewriter/focus/fullscreen）
- **文件**：`useFocusMode.ts` / `Toolbar.tsx` / `App.tsx` / `types.ts` / `App.css`
- **特性**：
  - typewriter/focus/fullscreen 模式自动隐藏工具栏、标签栏、状态栏
  - focus 模式切换暗色编辑器主题 + 暗色预览样式
  - fullscreen 使用 Fullscreen API，ESC 退出时自动恢复 normal

### F010 — 大纲导航侧边栏 — ✅ — 2026-04-09 09:16
- **测试**：11/11 ✅ | **TS**：✅ 零错误
- **审核**：通过。extractToc() 提取 ATX h1-h6 → TocSidebar 扁平树组件
- **文件**：`toc.ts` / `toc.test.ts` / `TocSidebar.tsx` / `Toolbar.tsx` / `App.tsx`
- **特性**：
  - Toolbar 新增大纲导航按钮（🗂 图标）
  - 侧边栏显示标题层级缩进 + 点击跳转
  - 空文档时提示"使用 # 创建标题"
  - 当前激活项高亮

### F011 — 深色模式 + 主题切换 — ✅ — 2026-04-09 09:26
- **测试**：10/10 ✅ | **TS**：✅ 零错误
- **审核**：通过。3 种内置主题（light/dark/sepia），CSS 变量注入方案
- **文件**：`theme.ts` / `theme.test.ts` / `Toolbar.tsx` / `App.tsx` / `types.ts`
- **特性**：
  - Toolbar 下拉选择器切换 ☀️/🌙/📖 三种主题
  - CSS 变量注入到 :root，color-scheme 同步系统滚动条
  - localStorage 持久化主题偏好
  - 护眼 sepia 主题适合长时间写作

### F012 — 版本历史（本地快照）— ✅ — 2026-04-09 09:32
- **测试**：13/13 ✅ | **TS**：✅ 零错误
- **审核**：通过。基于 localStorage 的轻量快照系统，每次手动保存时自动创建
- **文件**：`version-history.ts` / `version-history.test.ts` / `StatusBar.tsx` / `App.tsx`
- **特性**：
  - 最多保留 20 个快照，超出自动淘汰最旧
  - 连续相同内容自动去重
  - StatusBar 显示快照计数 + 🕐 弹出面板浏览历史
  - 相对时间格式（刚刚/N分钟前/N小时前）
  - 切换文件时自动加载对应快照列表

---
