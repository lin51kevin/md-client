# MarkLite 可用性提升 — 10 项改进任务拆解

## 任务分配

| # | 任务 | 复杂度 | 优先级 | 文件 |
|---|------|--------|--------|------|
| T1 | Undo/Redo 状态同步 WYSIWYG | 中 | 🔴 | `editor-bridge.ts`, `useEditorInstance.ts`, `Toolbar.tsx`, `StatusBar.tsx` |
| T2 | 预览区右键菜单增强 | 中 | 🔴 | `PreviewContextMenu.tsx`, `AppContextMenus.tsx` |
| T3 | 状态栏 WYSIWYG 适配 | 低 | 🔴 | `StatusBar.tsx`, `AppShell.tsx` |
| T4 | 快捷键 WYSIWYG 冲突处理 | 中 | 🔴 | `useKeyboardShortcuts.ts`, `AppShell.tsx` |
| T5 | 设置项分组优化 | 低 | 🟡 | `SettingsModal.tsx` |
| T6 | Tab 未保存视觉提示 | 低 | 🟡 | `TabBar.tsx` |
| T7 | 导出入口优化 | 低 | 🟡 | `Toolbar.tsx`, `PreviewContextMenu.tsx` |
| T8 | 文件树类型图标 | 中 | 🟢 | `FileTreeNode.tsx` |
| T9 | 搜索结果预览 | 中 | 🟢 | `SearchPanel.tsx` |
| T10 | 欢迎页增强 | 中 | 🟢 | `WelcomePage.tsx` |

## 并行分组

**批次 A（独立，可完全并行）：** T5, T6, T7, T8
**批次 B（需要协调）：** T1, T2, T3, T4
**批次 C（独立，可完全并行）：** T9, T10
