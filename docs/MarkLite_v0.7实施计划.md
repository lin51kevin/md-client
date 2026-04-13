# MarkLite v0.7 实施计划

> 版本目标：v0.7（1-2周）
> 包含功能：ZIP分发、幻灯片放映、主题市场+自定义CSS、Git集成、思维导图视图
> 文档生成：2026-04-13

---

## 一、ZIP分发（绕开360拦截）

### 1.1 目标
- 提供 ZIP 压缩包免安装版本，用户解压后直接运行 `marklite.exe`
- 自动创建桌面快捷方式和开始菜单项（可选）
- 解决 360 等杀软对未签名 EXE 的误报

### 1.2 具体实施

#### 技术方案：Tauri + NSIS 双打包
1. **NSIS 打包脚本** (`deploy/installer.nsi`)
   - 静默解压到 `%LOCALAPPDATA%/MarkLite`
   - 创建桌面快捷方式（可选勾选）
   - 创建开始菜单入口
   - 注册文件关联 `.md/.markdown`

2. **ZIP 包结构**
```
MarkLite-0.7.0-win64.zip
├── MarkLite.exe                 # 主程序
├── resources/                   # 运行时资源
│   ├── webview2/
│   └── icon.ico
├── README.html                 # 使用说明
└── uninstall.exe              # 卸载工具（可选）
```

3. **构建自动化** (`package.json` scripts)
```json
{
  "scripts": {
    "build:zip": "npm run tauri build -- --target x86_64-pc-windows-msvc && node scripts/create-zip.js",
    "build:nsis": "npm run tauri build -- --target x86_64-pc-windows-msvc && makensis deploy/installer.nsi"
  }
}
```

#### 工期预估：**0.5人日**
- 脚本编写 + 测试：4小时
- CI 集成（GitHub Actions）：2小时

---

## 二、P1-1: 幻灯片放映模式

### 2.1 目标
- 一键将 Markdown 转换为幻灯片视图（Reveal.js 风格）
- 支持 `.slide.md` 后缀识别或特殊注释 `<!-- slide:start -->`
- 全屏演示、键盘导航（←→ ↑↓ 空格）、演示者视图、计时器

### 2.2 具体实施

#### 前端组件：`SlidePreview`
1. **文件位置**：`src/components/SlidePreview.tsx`
   ```tsx
   interface SlidePreviewProps {
     markdown: string;
     theme?: 'white' | 'black' | 'league' | 'beige' | 'sky';
     showControls?: boolean;
     showProgress?: boolean;
     transition?: 'slide' | 'fade' | 'convex' | 'concave' | 'zoom';
   }
   ```

2. **Markdown 解析**：`src/lib/slide-parser.ts`
   - 分割规则：`---` 三个连字符作为幻灯片分页（兼容 Marp）
   - 标题处理：`# Title` 成为幻灯片主标题
   - 支持 Reveal.js 片段语法：`<!-- .element: class="fragment" -->`

3. **视图集成**：`App.tsx`
   - 工具栏添加"幻灯片模式"按钮，切换 `viewMode: 'slide'`
   - 快捷键：`F5` 进入全屏幻灯片模式
   - 退出：`ESC` 返回编辑模式

#### 后端渲染（可选）：`src-tauri/src/slide_export.rs`
- 将 Markdown 转换为 Reveal.js HTML 文件并打开浏览器
- 或嵌入 WebView 单独窗口演示

#### 工期预估：**2人日**
- 组件开发 + 样式：1人日
- Markdown 解析器 + 集成：0.5人日
- 测试 + 文档：0.5人日

---

## 三、P1-2: 主题市场 + 自定义CSS

### 3.1 目标
- 主题系统从4个内置扩展到可动态加载
- 在线主题市场（GitHub Gist 或内置主题库）
- 自定义 CSS 编辑器（类似 Obsidian 的 `snippets.css`）

### 3.2 具体实施

#### 3.2.1 主题系统重构
1. **主题配置文件格式**：`src/lib/themes/`
   ```json
   // dark-material.json
   {
     "name": "dark-material",
     "label": "🌙 Material Dark",
     "author": "社区",
     "version": "1.0.0",
     "cssVars": { ... },
     "cmTheme": "material",
     "previewClass": "markdown-preview-dark-material",
     "isDark": true
   }
   ```

2. **主题管理器**：`src/lib/theme-manager.ts`
   - `loadExternalTheme(url: string): Promise<ThemeConfig>`
   - `getInstalledThemes(): ThemeConfig[]`
   - `installTheme(theme: ThemeConfig): void`
   - `removeTheme(themeId: string): void`

3. **设置界面扩展**：`SettingsModal.tsx`
   - "主题"标签页增加"浏览主题市场"按钮
   - 主题卡片：预览缩略图 + 作者 + 下载按钮

#### 3.2.2 自定义 CSS
1. **CSS 编辑器面板**：`src/components/CustomCssEditor.tsx`
   - Monaco Editor 或 CodeMirror 实例
   - 实时预览（`style` 标签动态插入）
   - 保存到 `localStorage['marklite-custom-css']`

2. **CSS 作用域规则**
   - 编辑器区域：`.editor-container`
   - 预览区域：`.markdown-preview`
   - 文件树：`.file-tree-sidebar`
   - 工具栏：`.toolbar`

#### 3.2.3 主题市场（v0.7.1 或后续）
- GitHub Gist API 获取主题列表
- 或内置默认主题包（5-10个精选主题）

#### 工期预估：**3人日**
- 主题系统重构：1人日
- 自定义 CSS 编辑器：1人日
- UI 集成 + 测试：1人日

---

## 四、P1-3: Git 集成

### 4.1 目标
- 基础 Git 操作：status、diff、commit、push/pull
- 状态栏显示当前分支和文件状态
- 差异查看器（原生或调用外部工具）

### 4.2 具体实施

#### 4.2.1 后端：`src-tauri/src/git.rs`
```rust
#[tauri::command]
fn git_status(path: &str) -> Result<Vec<GitStatus>, String>;

#[tauri::command] 
fn git_commit(path: &str, message: &str) -> Result<String, String>;

#[tauri::command]
fn git_diff(path: &str, file_path: &str) -> Result<String, String>;
```

依赖项：`tauri-plugin-process` 调用系统 git 或嵌入 `git2` crate

#### 4.2.2 前端组件
1. **Git 状态栏**：`src/components/GitStatusBar.tsx`
   - 显示当前分支：`main ✓` 或 `feature*`
   - 文件状态：`3↑ 2↓`（新增/修改/删除计数）
   - 点击展开详细状态

2. **Git 面板**：`src/components/GitPanel.tsx`
   - 类似 VS Code Source Control 侧边栏
   - 变更文件列表 + 复选框勾选提交
   - 提交消息输入框 + 提交按钮
   - 推送/拉取按钮

3. **差异查看器**：`src/components/DiffViewer.tsx`
   - 基于 CodeMirror `mergeView` 或简单文本对比
   - 左右两栏显示修改前后

#### 4.2.3 集成点
- 工具栏：Git 按钮（显示/隐藏 Git 面板）
- 文件树：已修改文件显示 `M` 标记
- 状态栏：Git 状态区域

#### 工期预估：**4人日**
- 后端 Git 集成：1.5人日
- 前端组件开发：2人日
- 测试 + 文档：0.5人日

---

## 五、P1-4: 思维导图视图

### 5.1 目标
- Markdown 大纲（标题层级）自动转换为思维导图
- 双向编辑：修改导图节点 ↔ 更新 Markdown
- 导出为图片/JSON

### 5.2 具体实施

#### 5.2.1 思维导图引擎
**方案 A：Mermaid mindmap**
- 优点：已有 Mermaid 集成，零新增依赖
- 缺点：交互性弱，只能查看不能编辑

**方案 B：自定义 Canvas 渲染**
- 使用 `react-flow` 或 `antv/g6` 库
- 优点：完全可控，丰富交互
- 缺点：体积增大，学习曲线

**推荐方案**：v0.7 先用 Mermaid mindmap 实现查看模式，v0.8 再升级为可编辑

#### 5.2.2 具体实现
1. **大纲 → 思维导图转换**：`src/lib/mindmap-converter.ts`
   ```typescript
   export function tocToMindmap(toc: TocEntry[]): string {
     // 转换为 Mermaid mindmap 语法
     return `mindmap
       root((MarkLite))
         ${toc.map(entry => ...).join('\n')}`;
   }
   ```

2. **视图组件**：`src/components/MindmapView.tsx`
   - 接受 `markdown` 或 `tocEntries` 作为输入
   - 渲染 Mermaid mindmap 或自定义 Canvas
   - 工具栏：缩放、居中、切换布局（左右/径向）

3. **双向同步**
   - 只读模式（v0.7）：点击导图节点跳转到对应标题位置
   - 编辑模式（v0.8）：拖拽节点更新标题层级和顺序

#### 5.2.3 集成
- 视图模式：`viewMode: 'mindmap'`
- 大纲侧边栏增加"思维导图"切换按钮
- 导出菜单：新增"导出思维导图 PNG"

#### 工期预估：**2人日**
- Mermaid mindmap 转换器：0.5人日
- 视图组件 + 交互：1人日
- 集成 + 测试：0.5人日

---

## 六、资源分配与排期

### 6.1 人力估算（总：11.5人日）
| 功能模块 | 估算人日 | 技能要求 |
|----------|----------|----------|
| ZIP分发 | 0.5 | DevOps / 打包 |
| 幻灯片模式 | 2 | React + Markdown解析 |
| 主题市场 | 3 | CSS + UI + 状态管理 |
| Git集成 | 4 | Rust + Git + 前端组件 |
| 思维导图 | 2 | 可视化 + Mermaid |

### 6.2 里程碑排期（14个工作日）

**第一周（5天）**
- D1-D2：ZIP分发 + 幻灯片模式（基础）
- D3-D4：主题系统重构 + 自定义CSS
- D5：Git集成后端 + 状态栏

**第二周（5天）**  
- D6-D7：Git面板 + 差异查看器
- D8：思维导图（Mermaid查看模式）
- D9：集成测试 + Bug修复
- D10：文档 + 发布准备

**缓冲（2天）**
- 技术难点攻关 + 优化

### 6.3 风险与应对
| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| Git 集成跨平台问题 | 中 | 中 | 使用 `git2` crate 而非系统 git |
| 思维导图性能问题 | 低 | 中 | 限制节点数量（<200），虚拟滚动 |
| 主题系统复杂性 | 高 | 低 | 先实现本地主题加载，市场延后 |
| ZIP分发仍有拦截 | 低 | 高 | 准备备选方案：Inno Setup 或 MSIX |

---

## 七、技术决策记录

### 7.1 幻灯片引擎选择
**决策**：使用 Reveal.js 语法而非 Marp
**理由**：
- Reveal.js 更通用，社区资源丰富
- 动画效果和插件生态更成熟
- 与现有 Markdown 解析器兼容性好

### 7.2 Git 库选择
**决策**：后端使用 `git2` crate，前端调用
**理由**：
- 避免依赖用户环境 git
- 跨平台一致性更好
- 但会增大二进制体积 ~5MB

### 7.3 思维导图技术栈
**决策**：v0.7 用 Mermaid mindmap，v0.8 评估 `react-flow`
**理由**：
- 快速上线查看功能
- 基于现有技术栈，风险低
- 收集用户反馈后再投入可编辑版本

---

## 八、验收标准

### 8.1 功能完成度
- [ ] ZIP包解压后直接运行，无360拦截
- [ ] Markdown 正确分割为幻灯片，支持键盘导航
- [ ] 可加载外部主题文件，自定义CSS实时生效
- [ ] Git状态显示正确，提交/推送功能正常
- [ ] 大纲可转换为思维导图视图，节点可点击跳转

### 8.2 性能指标
- 幻灯片渲染延迟 < 200ms（100KB文档）
- 主题切换无闪烁
- Git 状态获取 < 1秒
- 思维导图渲染 < 500ms（50个节点）

### 8.3 质量要求
- 新增测试覆盖率 > 80%
- 无回归错误（现有功能正常）
- 中英文双语支持完整
- 文档更新（CHANGELOG + 用户指南）

---

**文档生成**: 阿呆  
**审核**: 阿瓜、大虾  
**执行**: 小呆瓜、阿呆团队