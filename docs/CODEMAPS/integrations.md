# MarkLite++ 集成与依赖映射

**最后更新**：2026-04-27 | **版本** — v0.10.5 (当前)

---

## 🔗 核心依赖生态

```
┌──────────────────────────────────────────────────────────────┐
│                     MarkLite++ 应用核心                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │            编辑与渲染引擎                                ││
│  ├─────────────────────────────────────────────────────────┤│
│  │                                                         ││
│  │ CodeMirror 6                react-markdown + Remark    ││
│  │ ├─ @codemirror/lang-*     ├─ remark-gfm               ││
│  │ ├─ @codemirror/autocomplete ├─ remark-math            ││
│  │ ├─ @codemirror/search     ├─ remark-footnotes         ││
│  │ └─ replit/codemirror-vim   ├─ remark-directive         ││
│  │                            ├─ remark-frontmatter       ││
│  │ KaTeX 0.16                 ├─ rehype-highlight         ││
│  │ ├─ 公式渲染                ├─ rehype-katex             ││
│  │ └─ SVG 导出                └─ rehype-raw               ││
│  │                                                         ││
│  │ Mermaid 11+                正则表达式                    ││
│  │ ├─ 流程图/时序图           ├─ 搜索替换                 ││
│  │ ├─ 饼图/类图               └─ 跨文件搜索               ││
│  │ └─ SVG 渲染                                              ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │            导出与渲染管道                               ││
│  ├─────────────────────────────────────────────────────────┤│
│  │                                                         ││
│  │ html2canvas              TypeScript (AST 转换)          ││
│  │ ├─ Mermaid → PNG         ├─ Markdown 解析              ││
│  │ ├─ LaTeX → PNG           └─ YAML Frontmatter 提取      ││
│  │ └─ 编辑器截图           │                              ││
│  │                          Rust 后端                     ││
│  │ EPUB 电子书              ├─ genpdf (PDF 生成)          ││
│  │ ├─ epub-gen (动态导入)   ├─ docx-rs (DOCX 生成)        ││
│  │ ├─ 元数据提取            └─ markdown-rs (Markdown 解析) ││
│  │ └─ 样式嵌入               │                              ││
│  │                          │                              ││
│  │ DOMPurify                图片处理                        ││
│  │ ├─ HTML 清洗             ├─ base64 编码/解码           ││
│  │ └─ XSS 防护              ├─ Image MIME 类型检查        ││
│  │                          └─ 大小限制 (50MB/单 200MB总) ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │            UI 框架与工具库                              ││
│  ├─────────────────────────────────────────────────────────┤│
│  │                                                         ││
│  │ React 19 + TypeScript            Tailwind CSS 4         ││
│  │ ├─ React Hooks (23个自定义)       ├─ CSS Variable 主题  ││
│  │ ├─ Context API                   ├─ 响应式布局          ││
│  │ └─ 事件系统                       └─ Utility-first CSS  ││
│  │                                                         ││
│  │ Tauri 2 (Rust)                   Build & Dev Tools     ││
│  │ ├─ Window API (原生窗口)         ├─ Vite 7             ││
│  │ ├─ File System API (安全)         ├─ TypeScript 5.8+   ││
│  │ ├─ Dialog (文件选择/保存)         ├─ Vitest + Testing  ││
│  │ ├─ IPC (前后端通讯)               ├─ Prettier          ││
│  │ └─ 应用生命周期                   └─ ESLint             ││
│  │                                                         ││
│  │ Icons & Utils                     Testing              ││
│  │ ├─ lucide-react (60+ 图标)        ├─ Vitest            ││
│  │ ├─ react-split (分屏)             ├─ @testing-library  ││
│  │ ├─ classnames (类名处理)          ├─ Happy DOM         ││
│  │ └─ uuid (ID 生成)                 └─ Mock Tauri API   ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 完整依赖清单

### 前端生产依赖 (npm/yarn)

#### 编辑器与预览 (6)
| 包 | 版本 | 用途 |
|-----|--------|----|
| `@codemirror/autocomplete` | ^6.20.1 | 代码自动补全 |
| `@codemirror/commands` | ^6.10.3 | 编辑命令 |
| `@codemirror/lang-*` | ^6.x | 支持多语言 (JS/Python/CSS/HTML) |
| `@codemirror/search` | ^6.6.0 | 查找替换 |
| `react-markdown` | ^9.0.1 | Markdown 渲染 |
| `@uiw/react-codemirror` | ^4.28.5 | React 组件包装 |

#### Markdown 解析與擴展 (7)
| 包 | 版本 | 用途 |
|-----|--------|------|
| `remark-gfm` | ^4.0.0 | GitHub Flavored Markdown |
| `remark-math` | ^6.1.0 | LaTeX 数学公式 |
| `remark-frontmatter` | ^6.0.0 | YAML frontmatter |
| `remark-footnotes` | ^4.0.1 | 脚注支持 `[^1]` |
| `remark-directive` | ^3.0.0 | 自定义容器 |
| `rehype-highlight` | ^7.0.0 | 代码块高亮 |
| `rehype-katex` | ^7.0.0 | KaTeX 渲染 |

#### 数学與圖表 (3)
| 包 | 版本 | 用途 |
|-----|--------|------|
| `katex` | ^0.16.9 | 公式渲染引擎 |
| `mermaid` | ^11.3.0 | 图表生成 |
| `html2canvas` | ^1.4.1 | DOM → 截图/PNG |

#### UI 組件與工具 (8)
| 包 | 版本 | 用途 |
|-----|--------|------|
| `react` | ^19.0.0 | 框架 |
| `react-dom` | ^19.0.0 | DOM 渲染 |
| `lucide-react` | ^0.394.0 | UI 图标库 |
| `react-split` | ^2.0.14 | 分屏组件 |
| `classnames` | ^2.5.1 | 类名处理 |
| `uuid` | ^10.0.0 | ID 生成 |
| `dompurify` | ^3.0.6 | HTML 清洗 (XSS 防护) |
| `epub-gen` | ^1.1.4 | 动态导入 EPUB 生成器 |

#### 应用框架 (2)
| 包 | 版本 | 用途 |
|-----|--------|------|
| `@tauri-apps/api` | ^2.0.3 | Tauri JavaScript API |
| `tailwindcss` | ^4.0.0 | 样式框架 |

#### 开发工具 (4)
| 包 | 版本 | 用处 |
|-----|--------|------|
| `typescript` | ~5.8 | 类型检查 |
| `vite` | ^7.0.0 | 构建工具 |
| `vitest` | ^2.0.0 | 单元测试框架 |
| `@testing-library/react` | ^15.0.0 | React 测试工具 |

### 后端生产依赖 (Cargo)

#### Tauri 核心 (2)
| Crate | 版本 | 用途 |
|-------|------|------|
| `tauri` | 2.0.0 | Desktop 框架 |
| `tauri-build` | 2.0.0 | 构建配置 |

#### 导出与渲染 (2)
| Crate | 版本 | 用途 |
|----------|--------|------|
| `genpdf` | ^0.7 | PDF 生成与渲染 |
| `docx-rs` | ^0.16 | DOCX 文件生成 |

#### 序列化與 JSON (2)
| Crate | 版本 | 用途 |
|-------|------|------|
| `serde` | ^1.0 | 序列化框架 |
| `serde_json` | ^1.0 | JSON 支持 |

#### 正则表達式 (1)
| Crate | 版本 | 用途 |
|-------|------|------|
| `regex` | ^1.10 | 正则搜索 |

#### 异步运行时 (1)
| Crate | 版本 | 用途 |
|-------|------|------|
| `tokio` | ^1 (通过 Tauri) | 异步执行 |

---

## 🔐 权限与安全模型

### Tauri 权限清单

```json
{
  "permissions": [
    "dialog:allow-open",           // 文件打开对话框
    "dialog:allow-save",           // 文件保存对话框
    "fs:allow-read-all",           // 读取文件
    "fs:allow-write-all",          // 写入文件
    "fs:allow-create-file",        // 新建文件
    "fs:allow-remove-file",        // 删除文件
    "fs:allow-remove-dir",         // 删除目录
    "opener:allow-open"            // 打开外部应用
  ]
}
```

### 路径安全策略

| 限制 | 实现 |
|------|------|
| 目录穿越 | `validate_user_path()` 规范化 + 黑名单 |
| 系统目录 | 禁止访问 `/System`, `/Windows`, `/usr/bin` 等 |
| 大文件 | 单文件 ≤50MB, 总计 ≤200MB |
| XSS 防护 | `DOMPurify.sanitize()` + Content-Security-Policy |
| 输入验证 | 路径/MIME 类型检查 |

---

## 🌍 国际化依赖

### i18n 资源

| 文件 | 语言 | 文本数 |
|------|------|--------|
| `i18n/en.ts` | English | 200+ |
| `i18n/zh-CN.ts` | 中文 (简体) | 200+ |

**集成方式**：React Context + localStorage 记录用户偏好

---

## 🔌 平台特定依赖

### macOS
- 原生窗口 (Cocoa)
- 暗黑模式 API
- 签名与公证 (Developer ID)

### Windows
- Win32 窗口 API
- NSIS 安装程序生成
- Console (for CLI)

### Linux
- GTK/X11 窗口系统
- AppImage 打包
- Freedesktop 标准

---

## 📊 版本矩阵

### 支持的 Node.js 版本

- **LTS**: 18, 20, 22
- **Latest**: 23+
- **最低**: 16 (Vite 7 要求)

### 支持的操作系统

| 平台 | 版本 | 架构 |
|------|------|------|
| macOS | 10.15+ | x86_64, arm64 |
| Windows | 10, 11 | x86_64 |
| Linux | Ubuntu 20.04+ | x86_64 |

---

## 🚀 构建与部署集成

### CI/CD 流程

```yaml
npm install → tsc → vite build → yarn tauri build
        ↓
    # macOS: .dmg 签名
    # Windows: .exe + .nsis
    # Linux: .AppImage + .deb
```

### 构建输出

| 平台 | 输出文件 |
|------|---------|
| macOS | `.dmg` (Universal Binary) |
| Windows | `.exe` + `.msi` installer |
| Linux | `.AppImage` + `.tar.gz` + `.deb` |

---

## 🔄 集成测试场景

### 导出管道测试

1. **Markdown → HTML** — react-markdown + remark 插件
2. **HTML → PNG** — html2canvas (Mermaid/LaTeX)
3. **PNG + Markdown → PDF** — 前端预渲染 + Rust 后端合成
4. **PNG + Markdown → DOCX** — 相同预渲染 + docx-rs

### 搜索测试

1. **正则搜索** — regex crate 编译 + 执行
2. **跨文件搜索** — 遍历目录 + 并行搜索 (待优化)
3. **替换验证** — 原子化更新文件内容

---

## 📈 依赖更新策略

### 安全更新

- **自动化** — Dependabot + GitHub Actions
- **策略** — patch 版本自动合并，minor/major 需人工审查
- **频率** — 每周扫描，漏洞立即修补

### 版本政策

- **主依赖** — 锁定 minor 版本 (e.g., ^19.0.0)
- **关键库** — 锁定 patch 版本 (e.g., 0.16.9)
- **测试库** — 允许更新

---

## 🔗 外部服务集成

### 可选集成（规划）

| 服务 | 用途 | 状态 |
|------|------|------|
| GitHub API | 草稿发布/GitHub Pages 部署 | 规划中 |
| Markdown It CDN | 插件动态加载 | 研究中 |
| Sentry | 错误上报与监控 | 研究中 |

### 本地文件系统

- **自动保存** — 文件直接写入本地 (无云同步)
- **快照** — localStorage 版本控制 (20 个快照)
- **资源** — `assets/images/` 本地存储图片

---

## 📚 开发依赖详解

### 测试依赖

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",                    // 单元测试
    "@testing-library/react": "^15.0.0",   // React 组件测试
    "@testing-library/user-event": "^14.0.0", // 用户交互模拟
    "happy-dom": "^12.10.0"                 // DOM 模拟
  }
}
```

### 类型检查

```json
{
  "devDependencies": {
    "typescript": "~5.8",                   // TypeScript 编译
    "@types/node": "^20.0.0",               // Node.js 类型
    "@types/react": "^19.0.0"               // React 类型
  }
}
```

---

## 🎯 集成最佳实践

1. **版本锁定** — 使用 `yarn.lock` 确保一致的依赖版本
2. **检查** — `yarn audit` 定期安全审计
3. **更新** — 月度更新 devDependencies, 季度更新生产依赖
4. **测试** — 更新后必须运行完整测试套件
5. **性能** — 监控 bundle 大小，移除不用的依赖

---

## 📋 故障排查

### 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| Tauri invoke 失败 | IPC 通讯断开 | 检查后端命令注册 |
| Mermaid 不渲染 | JS 加载延迟 | 添加 useEffect 等待初始化 |
| PDF 导出空白 | genpdf 字体缺失 | 嵌入 TTF 字体文件 |
| DOCX 表格错乱 | docx-rs 版本过低 | 升级至 0.16+ |
| LaTeX 显示错误 | KaTeX 字体未加载 | 检查 CSS 引入 |

