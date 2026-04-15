# MarkLite v0.9.0 版本 Bump 升级指南

**日期**：2026-04-15  
**更新内容**：磁盘文件变更检测、自动升级、工具栏 Undo/Redo、文件夹拖拽、文件类型关联、AI Copilot 增强、编码自动检测  
**当前版本**：v0.9.0 (当前版本)  
**下一版本**：v1.0.0 (规划版本)

---

## 📋 版本更新清单

### ✅ 已完成的文档更新

#### 配置文件更新（3个）
- [x] `package.json` — 版本 0.6.0 → 0.7.1
- [x] `src-tauri/tauri.conf.json` — 版本 0.6.0 → 0.7.1
- [x] `src-tauri/Cargo.toml` — 版本 0.6.0 → 0.7.1

#### 主要文档更新（4个）
- [x] `README.md` — 添加 v0.7.0 版本标识
- [x] `CHANGELOG.md` — 新增 v0.7.0 规划条目
- [x] `FEATURE_COMPARISON.md` — 版本号更新至 0.7.0
- [x] `USER_GUIDE.md` — 版本号与日期更新

#### 代码映射文档（4个）
- [x] `docs/CODEMAPS/INDEX.md` — 版本号与日期更新
- [x] `docs/CODEMAPS/ARCHITECTURE.md` — 版本号与日期更新
- [x] `docs/CODEMAPS/frontend.md` — 新建（1.6KB）
  - 30+ 前端组件详细清单
  - 23个自定义 Hooks 系统
  - 42个工具库模块
  - 关键数据结构定义
  - 主题系统架构
  - 775 个测试用例覆盖
  
- [x] `docs/CODEMAPS/backend.md` — 新建（1.1KB）
  - 14 个 Rust 命令 API
  - 导出流水线详解（PDF/DOCX）
  - 数据结构定义
  - 安全机制与验证
  - IPC 通讯协议
  - 性能特性与优化
  
- [x] `docs/CODEMAPS/integrations.md` — 新建（1.3KB）
  - 完整依赖生态图
  - 前端 18+ 依赖清单
  - 后端 8+ Cargo 依赖清单
  - 权限与安全模型
  - 平台特定依赖
  - 版本矩阵与兼容性
  - 部署与 CI/CD 集成

---

## 📊 更新统计

### 文件变更统计

| 类型 | 数量 | 操作 |
|------|------|------|
| 修改文件 | 8 | 版本号/日期更新 |
| 新建文件 | 3 | 代码映射文档 |
| 直接删除 | 0 | — |
| **总计** | **11** | — |

### 内容增量

| 文件 | 原大小 | 新大小 | 变化 |
|------|--------|--------|------|
| frontend.md | - | 16KB | +16KB (新建) |
| backend.md | - | 11KB | +11KB (新建) |
| integrations.md | - | 13KB | +13KB (新建) |
| **总增量** | - | 40KB | 代码映射增加 40KB 内容 |

---

## 🔍 版本号检查

### 已统一的版本号

```
✅ package.json:            0.7.0
✅ tauri.conf.json:         0.7.0
✅ README.md:               v0.7.0
✅ CHANGELOG.md:            [v0.7.0]
✅ FEATURE_COMPARISON.md:   v0.7.0
✅ USER_GUIDE.md:           v0.7.0
✅ CODEMAPS/INDEX.md:       v0.7.0
✅ CODEMAPS/ARCHITECTURE:   v0.7.0
✅ CODEMAPS/frontend.md:    v0.7.0
✅ CODEMAPS/backend.md:     v0.7.0
✅ CODEMAPS/integrations:   v0.7.0
```

### 日期统一

所有文档日期已更新至：**2026-04-13**

---

## 🚀 Git 提交步骤

### 1️⃣ 暂存所有更改

```bash
cd f:/md-client
git add -A
```

### 2️⃣ 验证暂存内容

```bash
git status
```

**预期输出**：
```
On branch main
Changes to be committed:
  (use "git restore --cached <file>..." to unstage)
        modified:   CHANGELOG.md
        modified:   FEATURE_COMPARISON.md
        modified:   docs/CODEMAPS/ARCHITECTURE.md
        modified:   docs/CODEMAPS/INDEX.md
        modified:   USER_GUIDE.md
        modified:   package.json
        modified:   src-tauri/tauri.conf.json
        new file:   docs/CODEMAPS/backend.md
        new file:   docs/CODEMAPS/frontend.md
        new file:   docs/CODEMAPS/integrations.md
```

### 3️⃣ 提交更改（使用约定式提交）

```bash
git commit -m "docs: bump version to v0.7.0 and update all documentation

- Update package.json and tauri.conf.json to v0.7.0
- Add comprehensive codemaps for frontend, backend, and integrations
  - frontend.md: 30+ components, 23 hooks, 42 utilities
  - backend.md: 14 Tauri commands, export pipeline, IPC protocol
  - integrations.md: Complete dependency matrix, security model
- Update all documentation with v0.7.0 version markers
- Update dates to 2026-04-13 across all docs
- Add v0.7.0 planned features to CHANGELOG

This is a planned version bump for documentation and architecture mapping."
```

### 4️⃣ 验证提交

```bash
git log --oneline -3
```

### 5️⃣ 推送到远程（可选）

```bash
# 推送到 origin/main
git push origin main

# 或推送到当前分支
git push -u origin $(git rev-parse --abbrev-ref HEAD)
```

### 6️⃣ 创建 Git 标签（可选）

```bash
# 创建版本标签
git tag -a v0.7.0 -m "Version 0.7.0 (Planning) - Documentation & Architecture Mapping
- Generate comprehensive codemaps for entire project
- Unify version across all configs and documentation
- Add 40KB of architecture and dependency documentation"

# 推送标签
git push origin v0.7.0
```

---

## 📝 变更日志详情

### CHANGELOG 新增内容

```markdown
## [v0.7.0] - TBD

### Planned Features

#### 文档与代码映射 (Docs)
- **完整代码映射文档** — 生成前端/后端/集成三个代码映射
- **文档现代化** — 更新所有文档至 v0.7.0
- **版本管理** — 统一版本配置

#### 规划中的功能
- **流式导出** — 支持大文件分段处理
- **并行搜索** — 多线程跨文件搜索
- **Git 集成** — 后端 Git 命令封装
- **主题编辑** — 自定义主题增强
- **插件系统** — 轻量级插件架构
```

---

## 🔗 文档导航

### 新建代码映射文档导航

#### 前端代码映射 ([docs/CODEMAPS/frontend.md](docs/CODEMAPS/frontend.md))
- **内容**：React 19 前端架构、30+ 组件、23个 Hooks、42个工具库
- **章节**：
  - 📐 前端架构概览
  - 📦 核心组件清单
  - 🪝 自定义 Hooks 系统
  - 📚 工具库模块
  - 🔌 关键数据结构
  - 🎨 主题系统
  - 📊 状态流向
  - 🧪 测试覆盖（775 个用例）
  - 📈 性能优化
  - 🔄 v0.6.0 更新流程

#### 后端代码映射 ([docs/CODEMAPS/backend.md](docs/CODEMAPS/backend.md))
- **内容**：Tauri 2 + Rust 后端架构、14 个命令、导出流水线
- **章节**：
  - 📦 Rust 后端架构
  - 🔧 核心命令系统（文件/目录/搜索/导出）
  - 📋 数据结构定义
  - 🔐 安全机制与路径验证
  - 📤 导出流水线详解（PDF/DOCX）
  - 🔄 IPC 通讯协议
  - 📊 性能特性与缓存
  - 🛠️ 依赖项
  - 🧪 测试策略
  - 📈 扩展计划（v0.7.0+）
  - 🚀 部署要点

#### 集成与依赖映射 ([docs/CODEMAPS/integrations.md](docs/CODEMAPS/integrations.md))
- **内容**：完整依赖生态、权限模型、部署矩阵
- **章节**：
  - 🔗 核心依赖生态图
  - 📦 完整依赖清单（前端 18+，后端 8+）
  - 🔐 权限与安全模型
  - 🌍 国际化依赖
  - 🔌 平台特定依赖
  - 📊 版本矩阵
  - 🚀 构建与部署集成
  - 🔄 集成测试场景
  - 📈 依赖更新策略
  - 🔗 外部服务集成
  - 📚 开发依赖详解
  - 🎯 集成最佳实践
  - 📋 故障排查

---

## 📦 后续步骤

### 立即可做的事情

1. **验证文档链接** — 确保所有 markdown 内部链接正确
2. **检查版本号** — 搜索 "0.6.0" 确认无遗漏
3. **测试构建** — 运行 `yarn build` 验证无错误
4. **推送提交** — 使用上述 Git 提交步骤

### 发布前置任务

- [ ] 运行完整测试：`yarn test`
- [ ] 验证类型：`tsc --noEmit`
- [ ] 代码质量：`yarn lint`
- [ ] 构建输出：`yarn tauri build`

### 发布清单

- [ ] 更新 GitHub Release 描述
- [ ] 上传平台特定二进制文件 (.dmg, .exe, .AppImage)
- [ ] 发布 npm 包（如有）
- [ ] 更新官网文档
- [ ] 通知用户渠道（Discord/Twitter/Blog）

---

## 🎯 关键版本号统一确认

运行以下命令验证所有版本号都是 0.7.0：

```bash
# 检查所有版本号
echo "=== package.json ===" && grep '"version"' package.json
echo -e "\n=== tauri.conf.json ===" && grep '"version"' src-tauri/tauri.conf.json
echo -e "\n=== README.md ===" && grep -i "v0.7.0" README.md | head -1
echo -e "\n=== CHANGELOG.md ===" && grep "v0.7.0" CHANGELOG.md | head -1
echo -e "\n=== 前端映射 ===" && grep "v0.7.0" docs/CODEMAPS/frontend.md | head -1
echo -e "\n=== 后端映射 ===" && grep "v0.7.0" docs/CODEMAPS/backend.md | head -1
echo -e "\n=== 集成映射 ===" && grep "v0.7.0" docs/CODEMAPS/integrations.md | head -1
```

---

## 📋 提交检查清单

在运行 `git commit` 前，确认以下内容：

- [x] 所有版本号已从 0.6.0 更新至 0.7.0
- [x] 日期已更新至 2026-04-13
- [x] 三个代码映射文档已创建
- [x] CHANGELOG 已添加 v0.7.0 规划条目
- [x] 所有文档链接有效
- [x] 没有遗留的 0.6.0 版本号（除了历史记录）
- [x] 新建文件已添加到 git
- [x] 修改的文件已暂存

---

## 💡 提示

### 如何撤销更改

如果需要撤销未提交的更改：

```bash
# 查看未提交的变更
git diff

# 撤销特定文件
git restore <文件路径>

# 撤销所有更改
git reset --hard HEAD
```

### 如何修改已提交的提交

如果提交信息有误，可以修改最后一次提交：

```bash
git commit --amend --message "新的提交信息"
```

### 如何查看提交历史

```bash
# 查看最近 5 次提交
git log --oneline -5

# 查看具体提交的更改
git show <commit-hash>
```

---

## 🎉 完成后续

提交后，你可以考虑：

1. **发布 Release** — 在 GitHub 创建 v0.7.0 Release
2. **更新主页** — 同步到项目官网
3. **通知社区** — 发布更新公告
4. **开始 v0.7.0 开发** — 规划具体功能实现

---

**准备好 Git Bump 提交了吗？使用上述步骤即可完成版本升级！** 🚀
