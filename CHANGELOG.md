# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [v0.9.9] - 2026-04-22


### Test

- fix useScrollSync, useTabs, useFileOps test failures (`6bf9d56`)
- fix 3 failing tests after git panel removal (`c4b645e`)
- add tests for HTML import rules, export TOC, and Worker DOM bootstrap (`ccfd0ef`)



### Fixed

- address code review warnings (`28ec525`)
- resolve keyboard shortcut conflicts with browser/WebView (`4b5a756`)
- restore default.json capabilities file to fix startup and theme issues (`7fd93cc`)
- add focus management and ARIA attributes to SettingsModal (`c474b6f`)
- properly cleanup open-file event listener on unmount (`8cfbc4e`)
- fix highlight.js alias to avoid intercepting subpath imports (`0f9f53a`)
- use resolveTabDoc for accurate save content (`de68d09`)
- handle plain <pre> blocks, admonitions, and TOC stripping (`76d779e`)
- add LRU eviction to savedStatesRef (max 20 tabs) (`889b990`)
- optimize LocalImage cache init and remove unused table pre-parsing (`4694fba`)
- apply theme CSS variables to large-doc banner and truncation expand UI (`6a26fe3`)
- offload blocking I/O to spawn_blocking to prevent Tokio stalls (`64793ca`)
- cleanup Worker on unmount + update test thresholds (`815e20a`)



### Performance

- stabilize pluginRuntimeDeps by using tabsRef instead of tabs array (`8a58652`)
- stabilize callback references in AppShell to prevent cascading re-renders (`f8cd0e0`)
- lazy-load heavy modals; memo sidebars; stable commandRegistry (`e3a8bea`)
- reduce re-renders across Milkdown, Preview, QuickOpen, FileTree (`c9d2db1`)
- defer heavy computation; truncate large docs (`4ba65f7`)
- stabilize effect with watchedPathsStr and tabsRef (`77760cd`)
- lower Worker offload threshold from 2 MB to 256 KB (`e14a25a`)
- refactor with snap-to-edge, cached dims, micro-scroll debounce (`8a9d632`)
- store doc content in docsRef, expose resolveTabDoc (`f2efd53`)



### Added

- progress toast type & large document preview optimization (`f6089b5`)
- HTML file import with Web Worker for large files (`36c2f05`)
- command palette edit-mode guard + AI command i18n & visibility (`5706885`)
- add large file warning on open (5MB threshold) (`5d46c81`)
- add slug IDs, syntax highlighting, and TOC generation (`ce1bbf4`)
- expand Turndown conversion rules (`bc9d2b9`)
- migrate CommandPalette hardcoded strings to i18n system (`10bbf61`)
- add PermissionApprovalModal to PluginPanel (`8f16ae3`)
- register marklite-git official plugin (`fe47174`)
- disable editable preview (Milkdown) by default (`d0c0885`)
- add reset all shortcuts button (`d659f30`)



### Docs

- add permission necessity comments to Tauri capabilities (`f5b6819`)



### Style

- normalize line endings to LF (CRLF → LF) (`d5c79b2`)
- normalize line endings to LF (CRLF → LF) (`d38772e`)



### Changed

- remove built-in Git panel from core (migrated to plugin) (`a5971d4`)
- extract Worker DOM bootstrap to html-import-dom (`6216870`)







## [v0.9.8] - 2026-04-21


### Changed

- bump version to v0.9.8 (`24ed349`)
- configure vitest coverage reporting (`c09edf6`)



### Fixed

- remove duplicate i18n keys and unused locale prop to fix build (`90a6183`)
- add Suspense fallback loading indicators (`8ff14b9`)
- migrate hardcoded i18n strings to t() calls (`efbb29e`)
- use pre-validated content snapshot in batch action apply (`37620e5`)
- propagate AbortError through ProviderRouter (`8b55c84`)
- close streaming reader on error in OllamaProvider (`384ec03`)
- remove savePlugins side-effect during React initialisation (`f8a58aa`)
- sanitise manifest fields from network and filesystem sources (`f06cbdb`)
- block non-function API property access without permission check (`ec5e7fc`)
- show permission dialog when installing plugins from registry (`4a0603a`)
- remove no-op plugin signature verification and fix falsy manifest check (`d70f965`)
- standardise THEME_PREFERENCE key to marklite- prefix (`8d2755a`)



### Performance

- conditional render modals in AppShell (`0196563`)
- wrap key components with React.memo (`8cde105`)



### Changed

- merge word-count and writing-stats into text-stats (`468f379`)
- extract settings tab contents into sub-components (`4aa7efe`)
- expand keyboard shortcut handler (`9085958`)



### Added

- add toast notification system (`d1a2b29`)
- add global ErrorBoundary to prevent white screen crashes (`a7220dc`)
- Windows right-click context menu integration (`d05bfa7`)
- add format and panel shortcut categories (`c95e4bf`)
- add editable preview toggle button (`8410be8`)



### Docs

- update README and app screenshot (`6e2fdce`)







## [v0.9.7] - 2026-04-20


### Fixed

- useDirWatcher cleanup and test correctness (`6821b9f`)
- fix 3 failing Rust unit tests (`b68fdf2`)
- refresh tree on file delete/create in root and subdirs (`747e3c7`)
- grant read/write/watch permissions for all paths (`b91aa25`)
- render markdown links in release notes as clickable buttons (`6410c5c`)
- correct download progress event parsing for plugin-updater v2 (`401048d`)



### Ci

- add Rust check and test to CI without generating binaries (`4238e74`)
- simplify CI to frontend-only build and test on main branch (`a90eec5`)



### Docs

- bump version to v0.9.7 and update all documentation (`5bcaebb`)



### Added

- self-fetch version via getVersion() and i18n app description (`ba49f57`)







## [v0.9.6] - 2026-04-20


### Added

- configure auto-updater with signing keys and artifacts (v0.9.6) (`3818ac6`)



### Fixed

- i18n template labels, cleanup hooks, remove unused commands (`7d39942`)







## [v0.9.5] - 2026-04-19


### Fixed

- template flash of sample.md content on welcome page (`e0c302c`)
- address code review warnings (T2/T7/T9) (`5f0162a`)
- welcome page template creation and layout restructure (`62bb609`)
- remove broken formatting items from preview context menu (`43d5b00`)
- remove AI buttons from floating toolbar and fix preview context menu (`135843e`)
- restore ProseMirror focus before running context menu formatting commands (`d1fbbef`)
- salvage selection-based fallback when structured instructions fail (`765694d`)
- remove unused wysiwygMode prop from AppContextMenus (`2829896`)
- prevent content overflow in split/edit/preview modes (`d1d95a7`)
- restore caret visibility in table cells and propagate runCommand edits (`53b37fc`)
- restore caret in table header cells (th) (`d98433e`)
- render raw HTML blocks in preview (`5d49ff6`)
- update test mocks and assertions for store migration (`3f8f1f1`)
- fix 6 test failures caused by Zustand store state leakage and stale mocks (`7921fe8`)
- keep undo/redo and slide/mindmap in WYSIWYG mode (`bd923a1`)
- keep divider before undo/redo, remove spellCheck/vimMode from settings (`e9c667d`)



### Changed

- bump version to v0.9.5 and update docs (`0ce26ae`)



### Added

- 10 usability improvements for MarkLite (`53caaa3`)
- add Japanese option to settings language selector (`db893bb`)
- add Japanese (ja-JP) locale with 280 translations (`4ea737c`)
- add copy full file path to clipboard in tab context menu (`64bd165`)
- hide source-editing UI in WYSIWYG mode (`02a9c51`)



### Changed

- slim down AppShell by wiring useEditorCore, AppContextMenus, AppGlobalOverlays (`7b620dd`)
- extract App.tsx into AppProviders + AppShell (`fc7140b`)
- migrate usePreferences and useSidebarPanel to zustand stores (`2611715`)



### Performance

- batch-read files for session restore via single IPC call (`e453bfe`)



### Deps

- add zustand state management library (`12a8679`)







## [v0.9.4] - 2026-04-18


### Changed

- bump version to v0.9.4 in docs and AboutModal (`c2873ce`)
- bump version to v0.9.4 and update changelog (`de56a57`)
- add .nvmrc and engines field to enforce Node >=18 (`b3409b8`)



### Changed

- fix misplaced test files and move BreadcrumbNav to sidebar/ (`b74372c`)
- update App.tsx imports for new folder structure (`2e7f09e`)
- reorganize components and lib into functional folders (`c422750`)
- reorganize lib into domain submodules (`be4eed8`)
- improve code quality based on code review (`86803f0`)



### Added

- add Quick Open (Ctrl+P), Preview Context Menu, and Breadcrumb Navigation (`916b867`)
- replace 'M' placeholder with app logo (`45ba201`)
- add AI Copilot chat panel toggle button (`8bea621`)



### Fixed

- valid identifier filter in plugin shim & FileTreeSidebar icon shrink (`2c9a187`)
- prevent icon squishing when panel is narrow (`21b792a`)
- DIAG-001 agent-loop resource leak + DIAG-008 tool param validation (`fcee39b`)
- switch to happy-dom + fix test env compatibility (`b64f544`)







## [v0.9.3] - 2026-04-17


### Changed

- bump version to v0.9.3 (`c3f7ba4`)
- upgrade to v0.9.3 - AI Agent Tool Use (`27b9512`)
- normalize CRLF line endings across codebase (`acb7d54`)
- remove snippet-manager plugin from build (`fcc49af`)
- remove deprecated preview-edit plugin (`7826ebb`)



### Added

- add keyboard shortcuts for tab switching (Ctrl+Tab, Ctrl+Shift+Tab) (`8df0158`)
- render AI chat responses as formatted markdown (`40001ab`)
- integrate AI polish/rewrite/translate/summarize into Milkdown floating toolbar (`5dd74a0`)
- integrate right-click AI actions into Copilot panel (`a49dbf2`)
- add structured instruction pipeline and fix build/test errors (`31273ec`)
- fix insert behavior and improve action planning (`da9c36a`)
- 增强文件夹拖拽功能与相关测试 (`913648d`)



### Fixed

- wire milkdown bridge into MilkdownPreview and fix prompt template vars (`aa6bbc4`)
- improve ai-copilot intent parsing and edit planning (`1100a5f`)
- harden ai-copilot apply flow and scope fallback (`585366b`)
- prevent milkdown init normalization from marking file dirty (`88962af`)
- file change detection - reload preserves clean state, auto-save suppressed (`eaa59f3`)
- prevent duplicate tabs when opening the same file quickly (`5ac512a`)
- enable watch feature for tauri-plugin-fs (`9c0082b`)
- persist viewMode across saves and remounts (`8a43878`)
- AI Copilot not loading in packaged build (`2f1df4a`)
- AI chat slash command keyboard nav and selection scope (`3466b3b`)
- fix milkdown inline toolbar css style (`efc2436`)
- remove hardcoded Pencil icon from plugin context menu items (`3494ce1`)



### Changed

- replace React unsaved-changes dialog with native OS dialog (`d6720ed`)
- load plugins from Tauri resource directory instead of embedded binary (`2636e4a`)
- externalize official plugins from main bundle (`2a4ed0a`)
- migrate AI context menu items to AI Copilot plugin (`dce35a7`)
- 优化聊天窗口按钮风格与交互 (`3515884`)



### Performance

- add Rust release profile for smaller binary (`8acb59f`)
- optimize bundle size - trim mermaid, KaTeX fonts, CM languages (`fffc747`)







## [v0.9.1] - 2026-04-16


### Docs

- reorganize documentation structure (`e737b2a`)
- add usability evaluation reports (`aaa0ee1`)



### Changed

- bump version to v0.9.1 (`6b83b22`)
- update dependencies (`c889d49`)



### Changed

- streamline appearance settings UI (`be44619`)



### Fixed

- resolve CodeBlockFoldOverlay infinite loop, serialization bug, and UI issues (`b0fa13c`)
- correct word count test expectations and reading time calculation (`e6c7d6c`)



### Added

- integrate new features into App and add misc UI (`aca216f`)
- enhance StatusBar with reading time and vim mode (`7c4dd09`)
- add CSS template manager (`5d5d1b7`)
- enhance shortcuts with search, filter, and conflict detection (`d48dd3d`)
- add typewriter mode enhancements (`646d04b`)
- add code block fold for Milkdown preview (`12a9882`)
- add AI text selection and result modal (`d05585f`)







## [v0.9.0] - 2026-04-15


### Changed

- move USER_GUIDE.md from docs/ to project root (`ba1bc9b`)
- replace in-app HelpModal with external GitHub USER_GUIDE.md link (`127cc28`)
- extract PluginPanel sub-components and strengthen plugin API types (`55314ae`)



### Changed

- bump version to v0.9.0 (`fdd5ce2`)
- bump version to v0.8.0 and update changelog (`391cd76`)
- remove Snippet Manager from plugin entries (already in settings) (`b6e8a89`)



### Fixed

- resolve TypeScript build errors in PluginPanel components (`f16992e`)
- plugin install from recommended tab now works correctly (`d65ff0d`)
- prevent editor pane from squeezing preview in split mode (`7bc4ca2`)
- resolve all TypeScript build errors (`a452954`)
- resolve Mermaid flowchart text rendering issue in Milkdown preview (`deb7bf8`)
- preserve AI chat state across slide/mindmap mode switches (`3826da5`)
- prevent AI Copilot panel from remounting on tab switch and UI changes (`160f5e1`)
- normalize yarn.lock to use registry.npmjs.org consistently (`ff3d702`)
- remove windows-only rollup native dep for cross-platform compatibility (`7e35127`)
- github action build break (`13b126e`)
- improve file watcher robustness and add watch permissions (`4243cc7`)
- align plugin IDs across registry/runtime/defaults + add preview-edit plugin (`1476ded`)
- resolve all code review issues from v0.8.0 audit (`0a0c75a`)
- address code review issues from v0.8.0 unpushed audit (`987dad5`)
- prevent event object passed to createNewTab causing blackscreen (`8f8e3ad`)
- distinct Lucide icons for plugin panels + uninstall removes sidebar icon (`e35ffe4`)
- auto-detect encoding for non-UTF-8 files (GBK/GB18030) (`9e96215`)
- show language button always visible in code blocks (`ab36c7a`)
- migrate usePlugins to Tauri v2 plugin APIs (`2e80dba`)
- resolve 8 critical/high security and correctness issues via TDD (`1357f5a`)
- resolve P1 path traversal risk in create-plugin.js (`97d20a6`)
- resolve P0 storage key inconsistency (C1) (`a756fa8`)
- address code review issues (`173e81a`)
- repair PluginPanel.test.tsx after Tauri stub fix and key rename (`659a8e3`)



### Added

- implement preview namespace for plugin system (`c09f6c2`)
- complete plugin activation pipeline (`2835232`)
- register file type associations for Markdown files (`bd5265d`)
- add toolbar Undo/Redo and folder drag-to-filetree (`4633f7b`)
- add disk file change detection with toast notifications (`3cfb48c`)
- improve ai copilot edit workflow and i18n (`3850547`)
- add stop generation button to AI chat panel (`eed5168`)
- add auto-upgrade support with update notification (`2ead5bc`)
- wire auto-update toggle + complete i18n for update settings (`4392d86`)
- wire plugin activation pipeline end-to-end (`1367176`)
- i18n AI panel UI and refine message layout (`394b6f5`)
- async incremental spring layout via RAF (`937a0d5`)
- upgrade preview to Milkdown Crepe WYSIWYG + audit fixes (`888cb09`)
- add plugin system core infrastructure (`edd832c`)
- hide preview-edit; fix failing tests (`ae735a8`)
- Phase 5 community ecosystem (`acda941`)
- Phase 3 security sandbox + Phase 4 official plugins (`0993281`)
- implement Commands API + Workspace API (Phase 2 Task D) (`e92e378`)
- Task E - PluginPanel real integration with usePlugins hook (`dbe611d`)
- add plugin panel UI and sidebar button (`154a822`)
- upgrade nodeviews to native Milkdown integration (`ec7fd55`)
- replace react-markdown with Milkdown WYSIWYG editor (`ded7ca4`)
- enhance preview editing with AST-based precision and undo/redo (`1f0b05b`)



### Test

- add tests for prompt-builder and openai-compatible provider (`8563ee6`)
- add missing unit tests for lib and hooks modules (`6c2212b`)
- 补全测试用例并修复失败的测试 (`c88e5fd`)



### Docs

- add missing v0.7.0/v0.8.0 feature sections to USER_GUIDE (`6181b2d`)







## [v0.7.2] - 2026-04-14


### Changed

- bump version to v0.7.2 and fix settings UI (`7e8a9fc`)
- update Cargo.toml version to 0.7.1 and document in guide (`c8728de`)
- bump version to v0.7.1 with updated documentation (`06409c7`)



### Changed

- extract 7 custom hooks from App.tsx for better code organization (`536b4e0`)
- upgrade git lock to RwLock, add path traversal guard, fix SidebarContainer saveWidth (`7e34a30`)



### Fixed

- resolve code review issues in local changes (`f9eef6d`)
- W1-W3 前端代码质量修复 (`bdfd8d3`)
- B3-B2 安全修复Rust后端git模块 (`35fe9b0`)
- exclude untitled tabs from session persistence (`9716395`)



### Docs

- add diagnostic review report for local commits (`964e1f9`)



### Added

- wrap sidebar panels in resizable SidebarContainer (`5bd742e`)
- git panel improvements, tab dedup, path normalization, and test coverage (`d539331`)
- 国际化 Git 面板所有硬编码文本 (`0bc7f94`)







## [v0.7.0] - 2026-04-13


### Fixed

- auto-save delay input UX — use number input (1–60s) instead of dropdown (`56a2ea6`)
- code review fixes and add tests (`d397529`)
- snippet insert at cursor position instead of replacing document (`defa571`)



### Added

- add custom tooltip to ActivityBar sidebar buttons on hover (`de32b16`)
- 思维导图视图 + fix: 搜索面板清空 bug (`d1cb705`)
- implement P1-2 custom CSS editor + P1-3 git integration (TDD) (`6116ec7`)
- UX improvements — sidebar close buttons, session restore, auto-save settings, single-instance (`dfbe9c8`)
- add insert snippet shortcut and toolbar button (`e0851bf`)
- add slide mode, custom theme management, and test fixes (`11077ef`)
- add ZIP distribution package support (`5ac7e11`)



### Docs

- generate v0.7.0 changelog from actual commits (`d9e28e8`)
- bump version to v0.7.0 and complete architecture mapping (`ca855f7`)



### Style

- 全局统一所有滚动条样式 (`990f827`)







## [v0.6.0] - 2026-04-12


### Changed

- bump version to v0.6.0 (`e23dff7`)



### Added

- toolbar enhancements & test suite expansion (v0.6.0) (`ff04dd2`)



### Changed

- extract UI hooks and add tests (`1c8849b`)







## [v0.5.1] - 2026-04-12


### Docs

- update changelog for white flash fix (`55bcda9`)



### Fixed

- prevent white flash on startup with theme pre-rendering (`831cac3`)



### Performance

- optimize bundle size and dependencies (`cae4593`)







## [v0.5.0] - 2026-04-12


### Added

- improve search, accessibility, and export pipeline (`639ebf4`)
- add user guide help modal with TOC navigation (`4a3b964`)
- Complete Stage 2 MarkLite improvements with full documentation (`97f576d`)
- Stage 2 MarkLite improvements (`205e903`)
- PDF 页码、导出进度指示器及多项 Bug 修复 (`4bbaae6`)



### Docs

- update CHANGELOG, README, USER_GUIDE and add FEATURE_COMPARISON for v0.5.0 (`d0a9eef`)



### Changed

- bump version to 0.5.0 (`fc19c2d`)
- 删除FEATURE_COMPARISON.md (`3cc36d2`)



### Changed

- extract App.tsx into focused hooks and components (`4d2db0d`)



### Fixed

- MarkLite export bug fixes (P0-3/Bug3, P0-5/Bug5, P1-1 CRLF, P1-6 progress) (`a3fa7f2`)







## [v0.4.0] - 2026-04-11


### Fixed

- export DOCX/PDF — use camelCase outputPath for Tauri 2 invoke (`79faaf8`)
- 搜索面板定位修复 + Enter 触发统一 (`6ada17c`)
- remove console.log, log drag-drop errors, tighten YAML frontmatter detection (`88384b7`)
- block native F5/refresh shortcuts, context menu, and devtools (`12a46ee`)
- SearchPanel i18n wiring + open file icon restoration (`3580686`)
- resolve editor theme switching and file rename issues (`2befd2c`)
- 修复文件树重命名后文件名未刷新显示的问题 (`f78dec9`)
- 修复文件树重命名按Enter键无效的问题 (`f06c0ae`)
- 修复主题色硬编码问题，实现完整的主题自适应 (`a5bf48a`)
- 新建标签命名规则 - 首次启动sample.md, 用户新建untitled.md (`d6ae923`)
- sync welcome page shortcuts with settings panel (Ctrl+1/2/3 for edit/split/preview) (`a89c454`)
- render mermaid via React component to prevent markdown parser mangling SVG CSS (`8f5bc01`)
- show welcome page when only default untitled tab exists (`f26b422`)
- strip foreignObject from SVG before canvas export to prevent taint error (`1878096`)
- remove unused onCloseAll parameter from TabBar (`0245981`)
- comprehensive health check — compile errors, memory leaks, i18n, path security (`3054d60`)
- default filename changed to sample.md with duplicate name handling (`9e3362d`)
- resolve 9 reported issues - tab activation, UI consistency, i18n support (`8b199f9`)
- mermaid 流程图预览支持 Windows CRLF 换行符 (`c587b6d`)
- resolve build errors by excluding test files from tsconfig (`94251a1`)
- 修复跨文件替换对未保存标签页的处理 (`dbcd861`)
- UI 细节修复 — 菜单配色/图标/主题适配 (`f859f7d`)
- 统一标签页右键菜单风格，移除所有图标只保留文字 (`0394c59`)
- 解决 build 和 test 失败 (`e940a25`)
- C1 编辑器右键上下文菜单 UI — Phase 1 验收补齐 (`ff1249c`)
- F016 Phase 2 缺陷修复 — 大纲H4-H6 + 多表格定位 + 模态框溢出 (`045ae87`)
- F014 脚注 + Frontmatter 接入预览管线 (`c58fc87`)
- F014 Phase 1 功能 UI 集成 — 图片粘贴 + 格式化按钮 (`05c3101`)
- persist rootPath across hide/show cycles (`ba09fe6`)



### Added

- enhance i18n and TOC sidebar (`2b1a386`)
- F016 表格可视化编辑 (`c76e7d5`)
- enhance export pipeline with image and math prerender (`5180a99`)
- improve DOCX/PDF export — mermaid images, math rendering, emoji fix (`aad6be7`)
- 支持快捷键自定义 (`31c9433`)
- F014 Toolbar 格式化按钮 — 核心工具函数 (`53c06db`)
- add Export PNG functionality (`1e2d069`)
- F014 右键上下文菜单 — 上下文检测工具 (`e399d05`)
- F014 脚注 + frontmatter 支持 (`e41f795`)
- add WelcomePage for empty-tab start screen (`1a9c419`)
- add keyboard shortcuts tab to settings panel (`6540263`)
- add comprehensive settings modal (F015) (`724fee3`)
- 工具栏添加VS Code风格标签页导航、优化主题切换体验、欢迎页增强 (`4be20fd`)
- F014 图片粘贴与拖拽插入 — 核心逻辑 (`c8be6e9`)
- F015 深色主题跟随系统设置 (`59b9f03`)
- SearchPanel i18n + 文件菜单图标 + 格式化抽离重构 (`9babb83`)
- UI 重构 — 文件菜单下拉（方案 A） (`d9e3393`)
- 统一搜索面板，支持未保存标签页的跨文件搜索 (`42b7787`)
- F016 跨文件全文搜索 (`d8a2a80`)
- 添加'关闭所有标签页'功能 (`e7cfb62`)
- F016 文件树侧边栏 (`caf6aa4`)
- complete i18n sweep — wire all hardcoded Chinese strings in TSX components (`12c4f52`)
- F015 写作统计面板 (`221906a`)
- add search filter to FileTreeSidebar (`d6848ac`)
- add CRUD operations — create, delete, rename files (`fee320f`)
- add dedicated CodeMirror themes for sepia and high-contrast (`3afb10a`)
- 更新导出菜单图标并添加文件操作快捷按钮 (`6c6c03e`)



### Changed

- 优化App组件结构与编辑器监听生命周期 (`5d8a4ff`)
- unify App Theme and Preview Theme into single theme system (`64eaa58`)



### Docs

- update FEATURE_COMPARISON with v0.4.0+ achievements (`1e4e25f`)
- update default welcome document with comprehensive feature showcase (`8b9f4e5`)
- 更新功能对比文档（含阶段2验收标准） (`a25e7c9`)
- 更新 README、CHANGELOG、FEATURE_COMPARISON 至 v0.4.0 (`7681568`)



### Test

- reorganize tests into __tests__ directory and achieve 100% pass rate (`7581992`)





### BREAKING CHANGE


- frontmatter现在通过React组件渲染而非HTML字符串





## [v0.3.0] - 2026-04-09


### Changed

- rename to MarkLite v0.3.0 and UI fixes (`695398c`)



### Added

- F013 分栏比例记忆 (`cce2a9e`)
- F013 未保存更改提示强化 (`685d025`)
- F013 标签页固定（Pin） (`e77c053`)
- F013 最近打开文件列表 (`9e574d0`)
- F013 Tab 重命名功能 (`b399d24`)



### Fixed

- F013 code review fixes — theme, pin, rename robustness (`5215d9c`)







## [v0.2.0] - 2026-04-09


### Performance

- lazy-load preview engine & fix toc parsing inside code fences (`96c36b6`)



### Fixed

- 修复版本历史弹框主题适配及快照逻辑 (`4ad7824`)
- 文件路径访问与相对路径支持的完整实现 (`0f8c7aa`)
- 修复多个UI交互和主题问题 (`d4d6d84`)



### Ci

- 升级 Node.js 到 22（Vite 7 要求 ^20.19.0 || >=22.12.0） (`2d359f7`)



### Docs

- 更新 CHANGELOG v0.2.0 (`cd162a3`)
- 重命名用户手册为英文文件名 (`12b905a`)
- 更新 README 添加截图展示和用户手册链接 (`29a7c98`)
- 更新 TDD_TRACKER 至 v0.2.0 (第二梯队全部完成) (`6e1835f`)



### F012

- 版本历史（本地快照） (`bf84239`)



### F011

- 深色模式 + 主题切换 (`8df9ebe`)



### F010

- 大纲导航侧边栏 (`ab5dee9`)



### F009

- 打字机/专注/全屏模式 (`9f079cc`)



### F008

- Mermaid 图表渲染 (`91b763e`)



### F007

- LaTeX 数学公式渲染 (remark-math + rehype-katex) (`d2d1b6f`)



### Added

- add auto-close brackets for Markdown editing (`2d09e52`)
- add find and replace with regex support (`d3e9dc7`)
- add Vim key binding support (`4f8025b`)
- add auto-save with debounce (1s delay) (`730b888`)
- add auto-save, HTML export, and word count (`8ce5020`)
- add HTML export functionality (`dc7af6e`)
- LaTeX 数学公式渲染 (remark-math + rehype-katex) (`a2ed864`)



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

- initial release of md-client v0.1.0 (`474ad7c`)







