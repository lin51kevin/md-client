# md-client 功能开发追踪

> 采用 TDD 工作流，每完成一个功能 → 审核 → 记录 checkpoint → 再进入下一个
> **禁止推送到远程仓库**

## 当前版本: v0.1.1 (a13ac82)

---

## 第一梯队（P0 — 依赖已装，快速接入）

- [x] **F001** — 自动补全（括号/链接/Markdown语法）
  - 状态：✅ 完成
  - Checkpoint：见下方日志
  
- [ ] **F002** — 全局搜索替换（Ctrl+F / Ctrl+H）
  - 状态：⏳ 待开始
  - Checkpoint：—

- [ ] **F003** — Vim 键位绑定
  - 状态：⏳ 待开始
  - Checkpoint：—

- [ ] **F004** — 自动保存（debounce 1s）
  - 状态：⏳ 待开始
  - Checkpoint：—

- [ ] **F005** — 导出 HTML
  - 状态：⏳ 待开始
  - Checkpoint：—

- [ ] **F006** — 实时字数统计
  - 状态：⏳ 待开始
  - Checkpoint：—

## 第二梯队（P1 — 1-2周）

- [ ] **F007** — LaTeX 数学公式渲染
- [ ] **F008** — Mermaid 图表渲染
- [ ] **F009** — 打字机模式 + 专注模式 + 全屏模式
- [ ] **F010** — 大纲导航侧边栏
- [ ] **F011** — 深色模式 + 主题切换
- [ ] **F012** — 版本历史（本地快照）

---

## Checkpoint 日志

### F001 — 自动补全 — ✅ — 2026-04-08 22:59
- **测试结果**：18/18 全部通过 ✅
  - 方括号：3 tests ✅
  - 圆括号：2 tests ✅
  - 花括号：1 test ✅
  - 反引号：2 tests ✅
  - 引号：2 tests ✅
  - 粗体/斜体：4 tests ✅
  - 无需补全：4 tests ✅
- **审核结论**：✅ 通过
  - 核心逻辑独立于 UI，可单元测试
  - CodeMirror 集成使用 inputHandler，不干扰默认行为
  - TS 编译零错误，无 lint 警告
  - * 注意：inputHandler 对组合键（如中文输入法）可能产生意外行为，需要在实际编辑中验证
- **新增/修改文件**：
  - `src/lib/autocomplete.ts` — 核心补全逻辑（纯函数）
  - `src/lib/cmAutocomplete.ts` — CodeMirror 扩展
  - `src/lib/autocomplete.test.ts` — 18 个测试用例
  - `src/App.tsx` — 集成 autoCloseBrackets extension
  - `vitest.config.ts` — 测试框架配置
  - `package.json` — 添加 vitest + 测试脚本
- **Commit hash**：`2d09e52`
- **备注**：TDD Red→Green 完美执行，先有3个失败用例（*处理逻辑），修复后全部通过

---
```
### FXXX — [功能名] — ✅/❌ — YYYY-MM-DD HH:MM
- 测试结果：
- 审核结论：
- 新增/修改文件：
- Commit hash：
- 备注：
```

---
