# MarkLite v0.5.0 全面诊断报告

> 诊断日期：2026-04-11 | 版本：v0.5.0 | 诊断工具：AI 静态分析 + 人工复核

## 总览

MarkLite 是基于 Tauri 2 + React 19 + CodeMirror 6 的桌面 Markdown 编辑器，功能丰富（多标签、分栏预览、Vim 模式、Wiki-Link、代码片段、版本快照、PDF/DOCX/EPUB/HTML/PNG 导出），但在安全防护细节、测试覆盖、代码组织和无障碍支持等方面仍有改进空间。

### 诊断评分

| 维度 | 得分 | 说明 |
| ---- | ---- | ---- |
| 功能完整性 | 8/10 | 功能媲美 Typora/Obsidian，差异化竞争力突出 |
| i18n 国际化 | 9/10 | 中英 230+ key 完整对等、零缺失、支持参数插值 |
| 性能优化 | 7/10 | 整体好（LRU 缓存、插件数组 module-level），SearchPanel 缺防抖 |
| 安全性 | 6/10 | 后端 Rust 防护完善，前端 XSS 过滤不完整 |
| 工程规范 | 6/10 | 构建配置有类型冲突，架构文档待补充 |
| 代码质量 | 6/10 | 少量重复代码，错误处理不够统一 |
| 测试覆盖 | 4/10 | Lib/Hook 覆盖好，组件/E2E/Rust 测试严重缺失 |
| 可访问性 | 3/10 | 仅 6/18 组件有 ARIA 属性 |
| **总体** | **5.8/10** | 功能可用，需打磨后方可达生产级品质 |

---

## 一、编译 / 类型错误（须立即修复）

### 1.1 useTableEditor.test.ts 类型不匹配

- **文件**: `src/__tests__/hooks/useTableEditor.test.ts` L10
- **问题**: `headers: ['Name', 'Age']` — `TableData.headers` 的实际类型与 mock 不匹配
- **影响**: TypeScript 编译报错
- **修复**: 查看 `src/lib/table-parser.ts` 中 `TableData` 定义，按实际类型修正 mock 数据；同时 L17/L26/L38 的 `cmViewRef` 应声明为 `{ current: EditorView | null }`

### 1.2 FileMenuDropdown.test.tsx 缺少字段

- **文件**: `src/__tests__/components/FileMenuDropdown.test.tsx` L16
- **问题**: `recentFiles` 缺少 `openedAt` 字段（`RecentFile` 接口必填）
- **修复**: 添加 `openedAt: '2026-04-10T10:00:00Z'` 到 mock 数据

### 1.3 vitest.config.ts 插件类型冲突

- **文件**: `vitest.config.ts` L5
- **问题**: vite `6.3.0` 与 vitest `2.1.0` 内置 vite 版本不兼容，导致 `plugins: [react()]` 类型报错
- **推荐方案**: 升级 vitest 到兼容 vite 6 的版本 — `npm i -D vitest@latest`
- **备选方案**: `plugins: [react() as any]` 临时绕过

---

## 二、安全问题

### 2.1 XSS 防护不完整 🔴 HIGH

- **文件**: `src/lib/html-export.ts` L166-172
- **现状**: `sanitizeJavascriptUris()` 仅拦截 `javascript:` 协议的 href
- **遗漏攻击向量**:
  - `data:text/html,...` 协议
  - `vbscript:` 协议
  - 事件处理器属性：`onerror`, `onclick`, `onload` 等
- **推荐方案**: 引入 DOMPurify 库
  ```bash
  npm i dompurify
  npm i -D @types/dompurify
  ```
  在 `markdownToHtml()` 返回后调用 `DOMPurify.sanitize(html, { ADD_TAGS: ['math', 'semantics', ...] })`，替代手写正则。保留 `escapeHtml()` 用于 title 等纯文本场景，删除 `sanitizeJavascriptUris()`。

### 2.2 导出 HTML 缺少安全头 🟡 MEDIUM

- **文件**: `src/lib/html-export.ts` HTML 模板
- **问题**: 生成的 HTML 文件无 Content-Security-Policy，外部 CDN 无 SRI 校验
- **修复**:
  - `<head>` 中添加 `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'unsafe-inline' https://cdn.jsdelivr.net">`
  - 外部 CDN 资源添加 `integrity` + `crossorigin="anonymous"` 属性

### 2.3 Tauri CSP unsafe-inline 🟡 MEDIUM

- **文件**: `src-tauri/tauri.conf.json`
- **现状**: `style-src 'unsafe-inline'`（主题切换需要）
- **建议**: 评估 nonce-based 方案收紧

### 2.4 安全方面做得好的地方 ✅

- Rust 后端 `validate_user_path()` 覆盖全面（路径遍历、系统目录拦截）
- 图片大小限制（单张 50MB / 总计 200MB）
- 无硬编码密钥
- Tauri 权限最小化（无网络/Shell 权限）

---

## 三、代码质量问题

### 3.1 文件偏大

| 文件 | 行数 | 建议上限 | 严重度 |
| ---- | ---- | ---- | ---- |
| `src/App.tsx` | ~506 | 400 | 🟡 中等偏大（胶水层，结构清晰） |
| `src/components/FileTreeSidebar.tsx` | ~450 | 400 | 🟡 |
| `src/components/SearchPanel.tsx` | ~430 | 400 | 🟡 |
| `src/components/MarkdownPreview.tsx` | ~380 | 400 | ✅ 合理 |
| `src/components/SettingsModal.tsx` | ~380 | 400 | ✅ 合理 |

### 3.2 代码重复

#### `escapeHtml()` — 两处实现有差异

| 文件 | 行号 | 差异 |
| ---- | ---- | ---- |
| `src/lib/html-export.ts` | L158-164 | 不含 `'` 转义 |
| `src/lib/markdown-extensions.ts` | L180-187 | 含 `'` → `&#39;` 转义 |

**修复**: 提取到 `src/lib/utils/html-safety.ts`，统一为完整版本（含 `&#39;`），两处替换为 import。

#### `clampPosition()` — 菜单定位逻辑

多个上下文菜单组件（`FileTreeSidebar.tsx`, `EditorContextMenu.tsx` 等）重复 `Math.min(x, window.innerWidth - width - 4)` 逻辑。

**修复**: 提取到 `src/lib/utils/position.ts`。

#### `isPristineTab()` — 原始标签页检测

`src/hooks/useTabs.ts` L137 和 L166 两处重复相同判断逻辑。

**修复**: 提取为顶层辅助函数：

```typescript
const isPristine = (tabs: Tab[]) =>
  tabs.length === 1 && !tabs[0].filePath && !tabs[0].isDirty && !tabs[0].displayName;
```

### 3.3 错误处理不足

| 文件 | 当前行为 | 建议修复 |
| ---- | ---- | ---- |
| `src/hooks/useFileOps.ts` | 对话框错误静默 catch | 改用 Tauri `message()` 提示用户 |
| `src/components/SearchPanel.tsx` | Rust invoke 失败仅设 error state | 确保 error 状态在 UI 中可见展示 |
| `src/components/FileTreeSidebar.tsx` | 错误仅 `console.log` | 改用 Tauri `message()` 弹窗 |
| `src/lib/html-export.ts` | Mermaid/LaTeX 渲染失败静默返回 null | 记录 warning + 插入占位符文本 |

### 3.4 状态管理碎片化

**`src/components/SearchPanel.tsx` L87-98** — 12 个 `useState` 声明中：

- `loading` / `error` / `replaceStatus` 可合并为 `useReducer`
- `caseSensitive` / `wholeWord` / `useRegex` / `crossFile` 可合并为 `searchOptions` 对象

### 3.5 性能缺失

- **SearchPanel**: 搜索输入无防抖，每次按键直接触发 Rust invoke → 添加 300ms debounce
- **FileTreeSidebar**: 节点展开时整棵树重渲染 → 优化 key 策略或使用 memo

### 3.6 App.tsx 可提取部分

- **L236-287**: `commandRegistry`（~50 行）→ 提取到 `src/lib/command-registry.ts`，导出工厂函数
- **L489-505**: SnippetManager 弹窗包装 → 移入 SnippetManager 组件内部，App.tsx 简化为 `<SnippetManager visible={...} onClose={...} />`

---

## 四、测试覆盖

### 4.1 现状概览

| 测试类型 | 文件数 | 现状 |
| ---- | ---- | ---- |
| Lib 模块测试 | 20 | ✅ 覆盖良好 |
| Hooks 测试 | 15 | ✅ 覆盖良好 |
| 组件测试 | 3/18 | ❌ 缺 15 个组件 |
| E2E 测试 | 0 | ❌ 无端到端流程覆盖 |
| 集成测试 | 0 | ❌ Hooks + 组件组合未测试 |
| Rust 后端测试 | 0 | ❌ export / preprocess 无测试 |

### 4.2 已测试的组件

- `FileTreeSidebar`（基础 stub）
- `StatusBar`
- `TabBar`

### 4.3 优先补全的组件测试

| 组件 | 测试重点 |
| ---- | ---- |
| MarkdownPreview | 渲染正确性、XSS 过滤、主题切换 |
| SearchPanel | 搜索 / 替换功能、跨文件模式、防抖 |
| Toolbar | 按钮渲染、事件分发、viewMode 切换 |
| CommandPalette | 命令搜索、模糊匹配、执行触发 |
| EditorContentArea | split / edit / preview 模式切换 |

### 4.4 E2E 测试计划

- 框架：Playwright（`npm i -D @playwright/test`）
- 基础流程：启动应用 → 新建文档 → 输入 Markdown → 预览验证 → 保存 → 导出 HTML

### 4.5 Rust 后端测试计划

- `markdown_preprocess.rs` — frontmatter 剥离、fenced block 状态机
- `export_pdf.rs` / `export_docx.rs` — 正常导出 + 恶意 Markdown 输入

### 4.6 覆盖率配置

在 `vitest.config.ts` 中添加：

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  thresholds: { lines: 80 },
}
```

### 4.7 测试做得好的地方 ✅

- XSS 防护有专门测试用例（`html-export.test.ts`）
- LaTeX 公式提取覆盖 50+ 场景
- Tauri API mock 完善
- 边界情况覆盖（CRLF/LF、多行公式等）

---

## 五、可访问性 (a11y)

### 5.1 当前状态

**有 ARIA 属性的组件（6/18）：**

| 组件 | 属性 |
| ---- | ---- |
| CommandPalette | `role="dialog"`, `aria-modal`, `aria-label`, `role="option"` |
| MarkdownPreview | `aria-label="Document metadata"` |
| SettingsModal | `role="switch"` |
| TocSidebar | `tabIndex`, `aria-label`（已本地化） |
| FileTreeSidebar | `tabIndex={0/-1}` |
| SnippetManager | `role="alert"` |

### 5.2 缺失的 ARIA 属性

| 组件 | 需要添加 |
| ---- | ---- |
| Toolbar | `role="toolbar"` + `aria-label` |
| TabBar | `role="tablist"`，tab 项 `role="tab"` + `aria-selected` |
| StatusBar | `aria-live="polite"` |
| ToolbarButton | `aria-label={title}`（当前仅有 `title` 属性） |
| InputDialog | `role="dialog"` + `aria-modal` |
| HelpModal | `role="dialog"` + `aria-modal` |

### 5.3 键盘导航

- 部分交互元素缺少 `tabIndex` 和 `onKeyDown` 处理
- Toolbar 不支持方向键导航

---

## 六、工程问题

### 6.1 依赖版本冲突

- vite `6.3.0` 与 vitest `2.1.0` 内置 vite 不兼容
- 修复：升级 vitest 到兼容 vite 6 的版本

### 6.2 FileTreeSidebar 展开状态丢失

- **文件**: `src/components/FileTreeSidebar.tsx` L53-55
- **问题**: `buildTreeNode()` 中 `expanded: false` 导致每次 render 重置展开状态
- **修复**: 用 `Set<string>` 记录用户已展开的路径，`buildTreeNode` 中根据 Set 决定 `expanded`

### 6.3 LaTeX 正则脆弱

- **文件**: `src/lib/export-prerender.ts`
- **问题**: 内联公式正则可能误匹配价格文本（如 `$5`）
- **修复**: 排除独立的 `$数字` 模式

### 6.4 YAML Frontmatter 解析简陋

- **文件**: `src/lib/html-export.ts`
- **问题**: 逐行解析不支持多行字符串、嵌套对象、数组
- **修复**: 改用 `yaml` 库（如 `js-yaml`）解析

### 6.5 架构文档缺失

- `docs/CODEMAPS/` 下多为占位符
- 待补充：前端组件图、后端导出流水线、集成依赖图

---

## 七、实施计划

### Phase 依赖关系

```
Phase 1 (编译+安全) ──→ Phase 2 (重构) ──→ Phase 3 (测试)
                                              ↓
                                         Phase 4 (a11y)  ← 可与 Phase 3 并行
                                              ↓
                                         Phase 5 (工程)
```

### Phase 1: 修复编译错误 + 安全加固 🔴 紧急

| 步骤 | 内容 | 涉及文件 |
| ---- | ---- | ---- |
| 1.1 | 修复 `useTableEditor.test.ts` 类型错误 | `src/__tests__/hooks/useTableEditor.test.ts` |
| 1.2 | 修复 `FileMenuDropdown.test.tsx` 缺字段 | `src/__tests__/components/FileMenuDropdown.test.tsx` |
| 1.3 | 升级 vitest 解决类型冲突 | `package.json`, `vitest.config.ts` |
| 1.4 | 安装 DOMPurify，替代手写 XSS 过滤 | `src/lib/html-export.ts` |
| 1.5 | 导出 HTML 添加 CSP meta + SRI | `src/lib/html-export.ts` |

### Phase 2: 代码重构 🟡 高优先级

| 步骤 | 内容 | 涉及文件 |
| ---- | ---- | ---- |
| 2.1 | 提取 `escapeHtml` 到公共模块 | 新建 `src/lib/utils/html-safety.ts`，修改 `html-export.ts`, `markdown-extensions.ts` |
| 2.2 | 提取 `clampPosition` | 新建 `src/lib/utils/position.ts`，修改上下文菜单组件 |
| 2.3 | 提取 `isPristineTab` | `src/hooks/useTabs.ts` |
| 2.4 | SearchPanel 状态合并 + 搜索防抖 | `src/components/SearchPanel.tsx` |
| 2.5 | 统一错误处理 | `useFileOps.ts`, `SearchPanel.tsx`, `FileTreeSidebar.tsx`, `html-export.ts` |
| 2.6 | 提取 commandRegistry | 新建 `src/lib/command-registry.ts`，修改 `src/App.tsx` |
| 2.7 | SnippetManager 弹窗内聚 | `src/components/SnippetManager.tsx`, `src/App.tsx` |

### Phase 3: 测试补全 🟡 中优先级

| 步骤 | 内容 | 涉及文件 |
| ---- | ---- | ---- |
| 3.1 | 补全 5 个关键组件测试 | `src/__tests__/components/` |
| 3.2 | 搭建 Playwright E2E | 新建 `e2e/`，`playwright.config.ts` |
| 3.3 | Rust 后端单元测试 | `src-tauri/src/` |
| 3.4 | 配置覆盖率报告（目标 80%） | `vitest.config.ts` |

### Phase 4: 可访问性 🔵 中低优先级

| 步骤 | 内容 | 涉及文件 |
| ---- | ---- | ---- |
| 4.1 | 添加语义化角色 | `Toolbar.tsx`, `TabBar.tsx`, `StatusBar.tsx`, `ToolbarButton.tsx` |
| 4.2 | 完善键盘导航 | 所有交互组件 |

### Phase 5: 工程优化 ⚪ 低优先级

| 步骤 | 内容 | 涉及文件 |
| ---- | ---- | ---- |
| 5.1 | FileTree 展开状态持久化 | `src/components/FileTreeSidebar.tsx` |
| 5.2 | LaTeX 正则优化 | `src/lib/export-prerender.ts` |
| 5.3 | YAML 解析增强 | `src/lib/html-export.ts` |
| 5.4 | 架构文档补全 | `docs/CODEMAPS/` |
