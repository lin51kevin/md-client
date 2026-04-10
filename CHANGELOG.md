# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [v0.4.0] - 2026-04-10

### Added (Phase 1 F014-F016 功能补齐)

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
- **跨文件全文搜索** — 工具栏新增搜索按钮，右侧弹出搜索面板，支持：
  - 正则表达式搜索
  - 大小写敏感选项
  - 最多 200 条结果展示
  - 点击跳转到匹配行
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
- **写作统计面板** — 状态栏右侧展示：
  - 字数/字符数/句子数
  - 预计阅读时间（350 字词/分钟）
  - 实时更新

### Fixed
- 修复 `toggleLinePrefix` API 不一致问题（返回值语义统一）
- 修复文件树子节点展开状态丢失 bug
- 移除编辑器和文件操作中的 `console.error` 调用，改为静默处理
- 移除死代码 `containerRef` 声明

### Improved
- 提升用户体验：右键菜单支持 viewport 边界防溢出
- 增强类型守卫：修正图片粘贴中的条件判断逻辑

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







