# MarkLite 后端代码映射

**最后更新**：2026-04-24 | **版本** — v0.10.4 (当前)

---

## 📦 Rust 后端架构

```
src-tauri/src/
├── main.rs                    # 应用入口，调用 lib::run()
├── lib.rs                     # 450+ 行 - Tauri 应用构建与命令注册
├── markdown_preprocess.rs     # Markdown 预处理（占位符替换）
├── export_pdf.rs              # PDF 导出管道
├── export_docx.rs             # DOCX 导出管道
└── utils/                     # 工具函数（文件验证、路径规范化）
```

---

## 🔧 核心命令系统

### 文件操作命令

| 命令 | 参数 | 返回值 | 职责 |
|------|------|--------|------|
| `read_file_text` | `{path: String}` | `String` | 读取文本文件内容 |
| `read_file_bytes` | `{path: String}` | `Vec<u8>` | 读取二进制文件（图片） |
| `write_file_text` | `{path, content}` | `bool` | 写入文本文件，创建目录 |
| `write_image_bytes` | `{path, data}` | `bool` | 写入图片二进制数据 |
| `create_file` | `{path, name}` | `String` (完整路径) | 新建空白文件 |
| `delete_file` | `{path}` | `bool` | 删除文件（传参为具体文件则删除，为空目录则删除目录） |
| `rename_file` | `{path, new_name}` | `bool` | 重命名文件 |

### 目录操作命令

| 命令 | 参数 | 返回值 | 职责 |
|------|------|--------|------|
| `list_directory` | `{path: String}` | `Vec<FileEntry>` | 列出单层目录（包含文件和文件夹） |
| `read_dir_recursive` | `{path, depth}` | `DirTree` | 递归列出目录树（可指定深度） |
| `read_dir_flat` | `{path, depth}` | 按指定深度拉平的文件列表 | 拉平的目录结构 |

### 搜索与替换命令

| 命令 | 参数 | 返回值 | 职责 |
|------|------|--------|------|
| `search_files` | `{path, pattern, use_regex, case_sensitive, max_results}` | `Vec<SearchResult>` | 跨文件搜索（正则/普通模式） |
| `replace_in_files` | `{path, pattern, replacement, use_regex}` | `ReplacementResult` | 跨文件替换（返回受影响文件数） |

### 导出命令

| 命令 | 参数 | 返回值 | 职责 |
|------|------|--------|------|
| `export_document` | `{markdown, format, output_path, pre_rendered_images}` | `{success, message}` | 统一导出入口（PDF/DOCX） |

### 其他命令

| 命令 | 职责 |
|------|------|
| `get_open_file` | 获取命令行传入的文件路径（CLI 集成） |
| `greet` | 测试用问候函数 |

---

## 📋 数据结构定义

### FileEntry 结构

```rust
pub struct FileEntry {
    pub name: String,           // 文件/文件夹名
    pub path: String,           // 完整路径
    pub is_dir: bool,          // 是否为文件夹
    pub modified: u64,         // 修改时间戳
    pub size: u64,             // 文件大小（字节）
}
```

### SearchResult 结构

```rust
pub struct SearchResult {
    pub path: String,
    pub line: u32,
    pub column: u32,
    pub text: String,
    pub matches: Vec<(u32, u32)>,  // (start, end) 位置
}
```

### DirTree 结构

```rust
pub struct DirTree {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<DirTree>>,
    pub modified: u64,
    pub size: u64,
}
```

---

## 🔐 安全机制

### 路径验证（validate_user_path）

```rust
fn validate_user_path(path: &str) -> Result<PathBuf> {
    // 1. 解析路径
    let path_buf = PathBuf::from(path);
    
    // 2. 规范化（处理 .. 上升）
    let canonical = path_buf.canonicalize()?;
    
    // 3. 黑名单检查（防止访问系统目录）
    let blacklist = [
        "/System", "/Library", "/usr/bin", 
        "C:\\Windows", "C:\\System32"
    ];
    for forbidden in blacklist {
        if canonical.to_string_lossy().starts_with(forbidden) {
            return Err("Access denied");
        }
    }
    
    // 4. 返回规范化路径
    Ok(canonical)
}
```

### 导出数据验证

- **单文件大小检查** — 单个图片 ≤ 50MB
- **总大小检查** — 所有预渲染图片总计 ≤ 200MB
- **base64 解码验证** — 解码失败立即返回错误
- **路径穿越防护** — 不允许 `..` 上升超出工作目录

---

## 📤 导出流水线详解

### PDF 导出流程

```
用户请求导出PDF
    ↓ [前端 invoke]
export_document(markdown, "pdf", path, pre_rendered_images)
    ↓
validate_user_path(output_path)      // 路径安全检查
    ↓
base64 解码 pre_rendered_images      // 解码PNG/SVG图片
    ↓
大小检查 (单个≤50MB, 总计≤200MB)
    ↓
markdown_preprocess()
    ├─ 提取占位符: {{mermaid_0}}, {{latex_1}}, ...
    ├─ 替换为: ![](base64:...) 或 <img src="data:...">
    └─ 返回处理后的 Markdown
    ↓
export_pdf()
    ├─ 调用 genpdf crate
    ├─ 渲染 Markdown → PDF layout
    ├─ 嵌入图片
    ├─ 生成页码与目录
    └─ 写入文件系统
    ↓
返回 {success: true, path: output_path}
```

### DOCX 导出流程

```
export_document(markdown, "docx", path, pre_rendered_images)
    ↓
预处理与验证 (同 PDF)
    ↓
markdown_preprocess()   // 占位符替换
    ↓
export_docx()
    ├─ 调用 docx-rs crate
    ├─ 解析 Markdown → DOCX AST
    ├─ 创建 paragraph/table/image 节点
    ├─ 嵌入样式 (字体、颜色、对齐)
    ├─ 插入 base64 图片
    └─ 序列化 .docx 二进制
    ↓
std::fs::write(path, docx_bytes)
    ↓
返回 {success: true}
```

---

## 🔄 IPC 通讯协议

### 请求格式（JSON）

```json
{
  "command": "export_document",
  "params": {
    "markdown": "# Hello\n\nContent...",
    "format": "pdf",
    "output_path": "/Users/user/output.pdf",
    "pre_rendered_images": {
      "mermaid_0": {
        "data": "iVBORw0KGgo...",
        "width": 800,
        "height": 600
      },
      "latex_1": {
        "data": "iVBORw0KGgo...",
        "width": 400,
        "height": 100
      }
    }
  }
}
```

### 响应格式

```json
{
  "success": true,
  "path": "/Users/user/output.pdf",
  "message": "Export successful"
}
```

错误响应：

```json
{
  "success": false,
  "message": "Error: File size exceeds limit (50MB)"
}
```

---

## 📊 性能特性

### 文件操作优化

- **异步处理** — 所有 Tauri 命令均异步执行，不阻塞 UI
- **流式读写** — 大文件使用流式 I/O（待实现）
- **缓存** — 目录树缓存 10 分钟防止高频访问

### 搜索性能

- **正则编译缓存** — regex pattern 编译后缓存
- **批量读取** — 一次读取多个文件减少 I/O 次数
- **早期退出** — 达到 `max_results` 限制后停止搜索
- **结果限制** — 最多返回 200 条结果（前端限制）

---

## 🛠️ 依赖项

### Cargo 依赖

- **tauri** ^2.0 — Desktop framework
- **serde** / **serde_json** — JSON 序列化
- **regex** — 正则搜索
- **genpdf** — PDF 生成
- **docx-rs** — DOCX 生成
- **tokio** — 异步运行时（Tauri 内嵌）

### 构建配置（Tauri v2）

- Tauri CLI 2.x
- Rust 1.70+
- 平台特定依赖（macOS/Windows/Linux 各异）

---

## 🧪 测试策略

### 单元测试

- 路径验证函数 — 边界情况测试（`..` 上升、符号链接、相对路径）
- Markdown 预处理 — 占位符替换准确性
- 文件操作 — 创建/删除/重命名异常处理

### 集成测试

- 导出管道 — 从 Markdown → PDF/DOCX → 文件
- 搜索替换 — 多文件跨目录操作
- 路径穿越防护 — 确保黑名单生效

### 手动测试清单

- [ ] 大文件导出（>10MB）
- [ ] 特殊字符文件名处理
- [ ] Windows CRLF 换行符
- [ ] 中文/emoji 文件名
- [ ] 符号链接与循环目录
- [ ] 权限受限目录访问

---

## 📈 扩展计划（v0.7.0+）

### 计划功能

- **流式导出** — 支持大文件边下载边展示进度
- **并行处理** — 多文件搜索并行化
- **预渲染缓存** — Mermaid/LaTeX 渲染结果本地缓存
- **Git 集成** — 后端 Git 命令封装（历史/diff/blame）
- **Web API** — RESTful + WebSocket 后端（支持远程编辑）

### 已知限制

- PDF 目录生成不支持 Unicode 书签
- DOCX 表格合并单元格渲染不完整
- 大文件搜索可能导致内存溢出（需流式处理）

---

## 🔗 前后端交互示例

### 保存文件流程

```rust
// 前端 (TypeScript)
await invoke('write_file_text', {
  path: '/Users/user/document.md',
  content: '# Hello\nContent...'
})

// 后端 (Rust) - lib.rs
#[tauri::command]
pub async fn write_file_text(path: String, content: String) -> Result<bool> {
    let validated_path = validate_user_path(&path)?;
    
    // 创建目录链（如果不存在）
    if let Some(parent) = validated_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    
    // 写入文件
    std::fs::write(&validated_path, content)?;
    
    Ok(true)
}
```

### 导出流程

```rust
// 前端
const preRenderedImages = await prerenderExportAssets(markdown);
const result = await invoke('export_document', {
  markdown,
  format: 'pdf',
  output_path: '/path/to/export.pdf',
  pre_rendered_images: preRenderedImages
});

// 后端
#[tauri::command]
pub async fn export_document(
    markdown: String,
    format: String,
    output_path: String,
    pre_rendered_images: Map<String, ImageData>
) -> Result<ExportResult> {
    // 验证 & 解码 & 导出
    let result = match format.as_str() {
        "pdf" => export_pdf(&markdown, &output_path, &pre_rendered_images).await?,
        "docx" => export_docx(&markdown, &output_path, &pre_rendered_images).await?,
        _ => return Err("Unsupported format".into())
    };
    
    Ok(result)
}
```

---

## 🚀 部署要点

### 二进制大小优化

- 开启 `strip = true` 移除符号信息
- 使用 `lto = true` 启用链接时优化
- 条件编译移除调试功能

### 跨平台兼容性

- 路径分隔符 — 统一转换为正斜杠 `/`
- 行分隔符 — 处理 LF/CRLF 混用
- 权限模型 — Windows 无 Unix 权限概念

### 签名与分发

- macOS 需开发者证书签名
- Windows 调用 NSIS 生成安装程序
- Linux 生成 AppImage 或 .deb
