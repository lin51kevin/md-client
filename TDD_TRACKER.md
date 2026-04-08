# md-client 功能开发追踪

> 采用 TDD 工作流，每完成一个功能 → 审核 → 记录 checkpoint → 再进入下一个
> **禁止推送到远程仓库**

## 当前版本: v0.1.1 (a13ac82)

---

## 第一梯队（P0 — 依赖已装，快速接入）

- [x] **F001** — 自动补全（括号/链接/Markdown语法） ✅ `2d09e52`
- [x] **F002** — 全局搜索替换（Ctrl+F / Ctrl+H） ✅ `d3e9dc7`
- [x] **F003** — Vim 键位绑定 ✅ `4f8025b`
- [x] **F004** — 自动保存（debounce 1s） ✅ `checkpoint`
- [x] **F005** — 导出 HTML ✅ `checkpoint`
- [x] **F006** — 实时字数统计 ✅ `checkpoint`

## 第二梯队（P1 — 1-2周）

- [ ] **F007** — LaTeX 数学公式渲染
- [ ] **F008** — Mermaid 图表渲染
- [ ] **F009** — 打字机/专注/全屏模式
- [ ] **F010** — 大纲导航侧边栏
- [ ] **F011** — 深色模式 + 主题切换
- [ ] **F012** — 版本历史（本地快照）

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
- **备注**：待集成到 StatusBar 组件显示实时字数

---
