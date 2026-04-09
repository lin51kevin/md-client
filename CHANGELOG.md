# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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

- initial release of md-client v0.1.0 (`474ad7c`)







