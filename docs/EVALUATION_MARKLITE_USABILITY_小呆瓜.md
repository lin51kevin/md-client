# MarkLite v0.9.0 可用性全面评估报告

**评估日期**: 2026-04-15  
**评估版本**: v0.9.0  
**评估人**: 小呆瓜  
**总体评分**: ⭐⭐⭐⭐☆ (78/100)

---

## 一、评估维度总览

| 维度 | 评分 | 核心问题数 | 改进空间 |
|------|------|-----------|---------|
| **首次体验** | ⭐⭐⭐⭐⭐ | 2 | 小 |
| **核心编辑** | ⭐⭐⭐⭐☆ | 3 | 中 |
| **导航组织** | ⭐⭐⭐⭐☆ | 4 | 中 |
| **搜索替换** | ⭐⭐⭐⭐☆ | 2 | 中 |
| **视图布局** | ⭐⭐⭐⭐⭐ | 1 | 小 |
| **文件管理** | ⭐⭐⭐☆☆ | 5 | 大 |
| **AI集成** | ⭐⭐⭐⭐☆ | 2 | 中 |
| **辅助功能** | ⭐⭐⭐☆☆ | 4 | 大 |
| **性能优化** | ⭐⭐⭐⭐☆ | 2 | 中 |

---

## 二、首次体验 (Onboarding)

### 2.1 现有优势 ✅

| 特性 | 说明 |
|------|------|
| **欢迎页面** | VS Code 风格双栏布局，视觉清晰 |
| **快捷键提示** | 首次使用显示常用快捷键 |
| **最近文件** | 快速访问历史文件 |
| **样本文档** | 提供示例快速上手 |

### 2.2 改进建议

#### P1: 添加首次使用引导tour

**问题**: 新用户首次打开可能不知道快捷键

**建议**: 添加交互式引导

```typescript
// onboarding-tour.tsx
interface TourStep {
  target: string;      // CSS选择器
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-toolbar="new"]',
    title: '新建文件',
    description: '点击或按 Ctrl+N 快速创建新文档',
    position: 'bottom',
  },
  {
    target: '[data-sidebar="filetree"]',
    title: '文件树',
    description: '拖拽文件夹到此处即可打开',
    position: 'right',
  },
  {
    target: '[data-ai-panel]',
    title: 'AI 助手',
    description: '输入 / 触发 AI 辅助写作',
    position: 'left',
  },
];

// 首次使用显示，localStorage 标记已看过
const shouldShowTour = !localStorage.getItem('marklite-tour-done');
```

#### P1: 快速打开面板 (Quick Open)

**缺失功能**: VS Code 的 `Ctrl+P` 快速打开文件

**建议实现**:

```typescript
// QuickOpenPanel.tsx
interface QuickOpenPanel {
  isOpen: boolean;
  query: string;
  results: FileItem[];
  selectedIndex: number;
}

// 模糊搜索最近文件 + 当前目录文件
const searchFiles = async (query: string): Promise<FileItem[]> => {
  const allFiles = await Promise.all([
    getRecentFiles(),      // 最近打开
    listDirectoryFiles(currentDir),  // 当前目录
  ]);
  
  return fuzzyMatch(allFiles, query);  // 模糊匹配
};

// 快捷键: Ctrl+P
// 显示最近修改的文件列表
// 支持 # 跳转到标题 (如 package.json#scripts)
```

---

## 三、核心编辑体验

### 3.1 现有优势 ✅

- ✅ CodeMirror 6 编辑器，成熟稳定
- ✅ 语法高亮完整
- ✅ 自动补全
- ✅ 多光标编辑
- ✅ Vim 模式支持

### 3.2 改进建议

#### P1: 粘贴为纯文本选项

**问题**: 从网页粘贴时保留格式（HTML/CSS），导致 Markdown 格式混乱

**当前**: 粘贴即粘贴，富文本内容直接进入文档

**建议**:

```typescript
// 选项1: 设置中默认粘贴为纯文本
interface Preferences {
  pasteAsPlainText: boolean;  // 默认 false，保持兼容
}

// 选项2: 粘贴时智能检测并提供选项
document.addEventListener('paste', (e) => {
  const html = e.clipboardData.getData('text/html');
  if (html && shouldOfferPlainText(html)) {
    showPasteOptions([
      { label: '粘贴为纯文本', action: () => pastePlainText() },
      { label: '保留格式', action: () => pasteWithFormat() },
    ]);
  }
});
```

#### P1: 代码块语言自动检测

**问题**: 粘贴代码时需要手动指定语言

**建议**: 粘贴代码时自动检测语言

```typescript
const detectCodeLanguage = (code: string): string => {
  // 简单实现: 基于关键字匹配
  if (code.includes('import ') && code.includes('from ')) return 'javascript';
  if (code.includes('def ') && code.includes(':')) return 'python';
  if (code.includes('func ') && code.includes('package ')) return 'go';
  // ... 更多检测
  return 'plaintext';
};
```

#### P2: 编辑器内折叠/展开

**缺失**: Markdown 标题折叠

**建议**: 支持按标题层级折叠

```typescript
// 基于标题的代码折叠
const foldedSections = new Map<string, boolean>();

const toggleFold = (headingId: string) => {
  const isFolded = foldedSections.get(headingId);
  foldedSections.set(headingId, !isFolded);
  // 更新编辑器视图
};

const foldAll = () => {
  headings.forEach(h => foldedSections.set(h.id, true));
};

const unfoldAll = () => {
  headings.forEach(h => foldedSections.set(h.id, false));
};
```

#### P2: 列编辑模式（非 Vim）

**问题**: 非 Vim 用户无法列编辑

**建议**: 添加 Alt+点击 列选择模式

```typescript
// 列编辑模式
const enableColumnSelection = () => {
  // CodeMirror 6 支持
  view.dispatch({
    effects: EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        // 检测 Alt 键，按列选择
      }
    })
  });
};
```

---

## 四、导航与标签管理

### 4.1 现有优势 ✅

- ✅ 标签栏显示打开的文件
- ✅ 标签拖拽排序
- ✅ 标签固定 (Pin)
- ✅ 关闭其他/所有标签
- ✅ 标签重命名

### 4.2 改进建议

#### P1: 标签页滚动和快速切换

**问题**: 打开10+标签时难以快速切换

**建议1**: 标签栏横向滚动 + 鼠标滚轮支持

```typescript
// TabBar.tsx
<div 
  className="tabbar-scroll"
  onWheel={(e) => {
    if (e.ctrlKey) {
      // Ctrl+滚轮 横向滚动标签
      e.currentTarget.scrollLeft += e.deltaY;
    }
  }}
>
```

**建议2**: Quick Switcher (`Ctrl+Tab`)

```typescript
// 类似 Chrome 的标签页切换器
const TabSwitcher = () => {
  // Ctrl+Tab 打开
  // 显示所有标签缩略图
  // 继续按 Tab 循环选择
  // Enter 确认
  // Esc 取消
};
```

#### P2: 标签页右键菜单增强

**当前菜单**:
- 关闭
- 关闭其他
- 关闭到左侧
- 关闭到右侧
- 关闭所有
- 固定/取消固定
- 重命名

**建议添加**:

| 菜单项 | 说明 |
|--------|------|
| **复制路径** | 复制文件完整路径 |
| **在文件管理器中显示** | 打开系统文件管理器 |
| **打开所在文件夹** | 在新窗口打开父目录 |
| **复制为相对路径** | 适合分享 |

#### P2: 标签页颜色标记

**缺失功能**: 无法给标签着色区分

**建议**:

```typescript
interface TabColor {
  tabId: string;
  color: string;  // hex color
}

// 支持预设颜色: 红/橙/黄/绿/蓝/紫
// 右键菜单选择颜色
```

---

## 五、搜索与替换

### 5.1 现有优势 ✅

- ✅ 强大搜索逻辑（大小写/正则/全词）
- ✅ 跨文件搜索
- ✅ 搜索高亮
- ✅ 搜索历史

### 5.2 改进建议

#### P1: 搜索预览（Search Preview）

**问题**: 点击搜索结果前无法预览内容

**建议**:

```typescript
// SearchPanel.tsx
{/* 当前只显示文件列表 */}
{/* 建议添加悬停预览 */}
<div className="search-result">
  <div 
    className="result-preview"
    onMouseEnter={() => showInlinePreview(result)}
  >
    {/* 显示匹配行的上下文 */}
    {getMatchContext(result, 2)}  // 前后2行
  </div>
</div>
```

#### P1: 搜索结果批量操作

**缺失**: 批量替换后无法撤销

**建议**:

```typescript
// 替换前确认
const handleReplaceAll = async () => {
  const preview = await getReplacePreview(query, replacement);
  
  // 显示预览对话框
  showConfirmDialog({
    title: '批量替换确认',
    message: `将替换 ${preview.count} 处匹配`,
    diff: preview.diff,  // 显示差异
  });
  
  // 替换后可以撤销
  const oldContent = await backupCurrentFile();
  await performReplace(preview);
  addToUndoStack({ type: 'bulk-replace', oldContent, newContent });
};
```

---

## 六、视图与布局

### 6.1 现有优势 ✅

- ✅ 多种视图模式（编辑/分屏/预览/幻灯片/思维导图）
- ✅ 焦点模式（打字机/专注/全屏）
- ✅ 可拖拽分隔线
- ✅ 侧边栏可折叠

### 6.2 改进建议

#### P2: 自定义布局保存

**问题**: 无法保存自定义布局

**建议**:

```typescript
// 布局管理器
interface LayoutPreset {
  id: string;
  name: string;
  config: {
    viewMode: ViewMode;
    sidebarWidth: number;
    sidebarVisible: boolean;
    sidebarPanel: 'filetree' | 'toc' | 'search';
    aiPanelVisible: boolean;
    aiPanelWidth: number;
  };
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  { id: 'writing', name: '写作模式', config: { ... } },
  { id: 'coding', name: '代码模式', config: { ... } },
  { id: 'review', name: '审阅模式', config: { ... } },
];

// 快速切换: Ctrl+Alt+1/2/3
```

#### P2: 分屏增强

**当前**: 只支持左右分屏

**建议**: 支持上下分屏或多窗口

```typescript
// 上下分屏
const splitVertically = () => {
  // 将当前文件在下方新建一个面板
};

// 多窗口支持 (Tauri 原生)
// 可同时打开多个 MarkLite 窗口
```

---

## 七、文件管理

### 7.1 现有优势 ✅

- ✅ 文件树侧边栏
- ✅ 拖拽打开文件
- ✅ 最近文件列表
- ✅ 文件监控 + 变更提示
- ✅ Reveal in Explorer

### 7.2 重大改进建议 🚨

#### P0: 脏标签页批量保存

**问题**: 关闭多个有未保存内容的标签时会逐个弹窗确认，非常繁琐

**当前行为**: 每个脏标签都弹窗

**建议**:

```typescript
// 统一确认对话框
const handleCloseAll = async () => {
  const dirtyTabs = tabs.filter(t => t.isDirty);
  
  if (dirtyTabs.length === 0) {
    closeAllTabs();
    return;
  }
  
  // 批量确认对话框
  const result = await showBatchSaveDialog({
    title: '关闭多个文件',
    message: `${dirtyTabs.length} 个文件有未保存的更改`,
    items: dirtyTabs.map(tab => ({
      id: tab.id,
      name: tab.displayName || tab.filePath?.split('/').pop(),
      isDirty: tab.isDirty,
    })),
    actions: ['保存全部', '全部放弃', '取消'],
  });
  
  if (result === 'save-all') {
    for (const tab of dirtyTabs) {
      await saveFile(tab.id);
    }
    closeAllTabs();
  } else if (result === 'discard-all') {
    closeAllTabs();
  }
  // cancel: do nothing
};
```

#### P1: 文件树增强

**缺失功能**:

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **文件搜索/过滤** | 在文件树中快速过滤 | P1 |
| **展开/折叠所有** | 一键展开或折叠目录树 | P1 |
| **新建文件/文件夹** | 在文件树中右键新建 | P1 |
| **重命名** | 文件树中直接重命名 | P1 |
| **删除确认** | 删除文件时二次确认 | P1 |
| **复制/移动文件** | 文件操作 | P2 |

**建议实现**:

```typescript
// FileTreeContextMenu.tsx
const contextMenuItems = [
  { label: '新建文件', shortcut: 'Ctrl+N', action: () => createFile() },
  { label: '新建文件夹', shortcut: 'Ctrl+Shift+N', action: () => createFolder() },
  { type: 'separator' },
  { label: '重命名', shortcut: 'F2', action: () => startRename() },
  { label: '删除', shortcut: 'Delete', action: () => confirmDelete() },
  { type: 'separator' },
  { label: '复制路径', action: () => copyPath() },
  { label: '复制文件名', action: () => copyFileName() },
];
```

#### P1: 外部文件变化处理

**当前**: 检测到变化后显示 Toast，但选择有限

**建议增强**:

```typescript
// FileChangeToast.tsx
const options = [
  { 
    label: '重新加载', 
    action: () => reloadFile(),
    description: '放弃当前修改，加载磁盘版本',
  },
  { 
    label: '查看差异', 
    action: () => showDiffView(),
    description: '对比两个版本的差异',
  },
  { 
    label: '保留当前', 
    action: () => dismissNotification(),
    description: '保持当前编辑状态',
  },
  { 
    label: '保存副本', 
    action: () => saveAsCopy(),
    description: '保存当前版本到新文件',
  },
];
```

---

## 八、AI Copilot 集成

### 8.1 现有优势 ✅

- ✅ 多 Provider 支持（Ollama/OpenAI兼容）
- ✅ 智能编辑（重写/续写/简化）
- ✅ 快捷命令（总结/翻译/TODO）
- ✅ 停止生成按钮
- ✅ 对话式交互

### 8.2 改进建议

#### P1: AI 输出格式优化

**问题**: AI 生成的 Markdown 可能格式不佳

**建议**: 添加输出格式化选项

```typescript
// AI 设置选项
interface AIOutputSettings {
  autoFormat: boolean;      // 自动格式化输出
  formatOnPaste: boolean;   // 粘贴时格式化
  indentSize: 2 | 4;       // 缩进大小
  maxLineLength: number;    // 最大行长度
}
```

#### P2: AI 对话历史管理

**缺失**: 对话历史无法保存和检索

**建议**:

```typescript
// 会话历史
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  filePath?: string;  // 关联的文件
}

// 支持:
// - 保存会话
// - 重命名会话
// - 搜索历史对话
// - 导出对话为 Markdown
```

---

## 九、辅助功能 (Accessibility)

### 9.1 当前状态 ⚠️

| 功能 | 支持情况 |
|------|---------|
| **键盘导航** | 部分支持 |
| **屏幕阅读器** | 基础支持 |
| **高对比度** | 依赖主题 |
| **键盘快捷键** | 完整但不可自定义所有 |

### 9.2 改进建议

#### P1: 完整的键盘导航

**问题**: 部分交互只能用鼠标

**建议**: 添加全局焦点管理

```typescript
// 可聚焦元素
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'a[href]',
].join(',');

const handleTabNav = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    // 确保焦点在可聚焦元素间移动
  }
  
  if (e.key === 'Escape') {
    // 返回上一个焦点区域
  }
};
```

#### P1: 命令面板增强

**当前**: `Ctrl+Shift+P` 打开

**建议**:

```typescript
// 命令面板增强
const CommandPalette = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  // 支持:
  // - 模糊搜索命令
  // - 显示快捷键提示
  // - 最近使用命令置顶
  // - 命令分类（文件/编辑/视图/AI）
  
  return (
    <div className="command-palette">
      <input 
        type="text" 
        placeholder="输入命令或快捷键..."
        autoFocus
      />
      <div className="results">
        {results.map(cmd => (
          <div key={cmd.id}>
            <span>{cmd.label}</span>
            <kbd>{cmd.shortcut}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### P2: 触控/平板支持

**问题**: 主要针对桌面鼠标操作优化

**建议**:

```typescript
// 触控优化
const touchOptimizations = {
  // 双指缩放编辑器
  enablePinchZoom: true,
  
  // 长按显示上下文菜单
  longPressDuration: 500,
  
  // 滑动切换标签
  swipeThreshold: 50,
  
  // 更大的点击目标
  minTouchTarget: 44,  // WCAG 推荐
};
```

---

## 十、性能优化

### 10.1 当前状态 ⚠️

| 场景 | 性能 |
|------|------|
| 启动速度 | 🟢 快 (<2s) |
| 大文件打开 | 🟡 中 (5MB+ 较慢) |
| 搜索性能 | 🟢 快 |
| AI 响应 | 🟡 取决于网络 |
| 内存占用 | 🟡 中等 |

### 10.2 改进建议

#### P1: 大文件优化

**问题**: 打开 10MB+ 文件明显卡顿

**建议**:

```typescript
// 虚拟滚动 - 只渲染可见行
const VirtualLineRenderer = ({ content, visibleRange }) => {
  // 只渲染 visibleRange 内的行
  // 上下预留缓冲区
};

// 懒加载大文件内容
const loadLargeFile = async (path: string) => {
  const stats = await getFileStats(path);
  
  if (stats.size > LARGE_FILE_THRESHOLD) {
    // 分块加载
    const chunks = await loadFileInChunks(path, CHUNK_SIZE);
    return new ChunkedDocument(chunks);
  }
  
  return await loadFile(path);
};
```

#### P2: 后台预加载

**建议**:

```typescript
// 智能预加载
const preloadManager = {
  // 预加载相邻文件（用户可能打开）
  preloadAdjacent: (currentPath) => {
    const dir = getDirectory(currentPath);
    const adjacent = getAdjacentFiles(dir, currentPath);
    adjacent.forEach(f => prefetch(f));
  },
  
  // 预加载搜索结果文件内容
  preloadSearchResults: (results) => {
    results.slice(0, 5).forEach(r => prefetch(r.path));
  },
};
```

---

## 十一、用户友好度细节

### 11.1 需要打磨的细节

| # | 问题 | 建议 | 优先级 |
|---|------|------|--------|
| 1 | **拖拽时无视觉反馈** | 添加拖拽覆盖层 + 文件计数 | P1 |
| 2 | **无法撤销关闭标签** | 添加"重新打开最近关闭" (`Ctrl+Shift+T`) | P1 |
| 3 | **无法显示不可见字符** | 添加开关显示 Tab/换行 | P2 |
| 4 | **字数统计不够丰富** | 添加字符数、句子数、段落数 | P2 |
| 5 | **无行号显示开关** | 状态栏可切换行号显示 | P2 |
| 6 | **选中颜色不够明显** | 高亮颜色对比度不足 | P2 |
| 7 | **滚动条样式** | 滚动条过细，不好操作 | P3 |
| 8 | **无鼠标手势** | 支持鼠标手势快捷操作 | P3 |

### 11.2 缺失的贴心功能

| 功能 | 说明 | 心情价值 |
|------|------|---------|
| **番茄钟** | 写作计时器 | ⭐⭐⭐⭐⭐ |
| **字数目标** | 设置每日/文档字数目标 | ⭐⭐⭐⭐ |
| **打字音效** | 可开关的打字音效 | ⭐⭐⭐ |
| **护眼提醒** | 每45分钟提醒休息 | ⭐⭐⭐ |
| **导出预览** | 导出前实时预览效果 | ⭐⭐⭐⭐ |
| **历史快照命名** | 可给版本快照添加备注 | ⭐⭐⭐ |

---

## 十二、优先级实施路线图

### P0 (立即修复)

1. ~~新建标签页黑屏问题~~ ✅ 已修复
2. 脏标签页批量保存优化

### P1 (本月完成)

1. 添加首次使用引导 Tour
2. Quick Open 面板 (`Ctrl+P`)
3. 粘贴为纯文本选项
4. 搜索结果预览
5. 标签页快速切换器 (`Ctrl+Tab`)
6. 外部文件变化的"查看差异"选项

### P2 (下月完成)

1. 命令面板增强
2. 文件树右键完整菜单
3. 代码块语言自动检测
4. 自定义布局保存
5. 编辑器内折叠/展开
6. AI 对话历史管理

### P3 (后续迭代)

1. 番茄钟/字数目标
2. 触控优化
3. 多窗口支持
4. 滚动条样式优化

---

## 十三、总结

### 13.1 核心优势

- 🏆 **技术栈优秀**: Tauri + React + CodeMirror 6，现代化且高性能
- 🏆 **视图模式丰富**: 编辑/分屏/预览/幻灯片/思维导图，覆盖全面
- 🏆 **AI 集成完整**: 多 Provider 支持，智能编辑功能丰富
- 🏆 **国际化良好**: 中英文支持完善

### 13.2 主要短板

- ⚠️ **文件管理功能偏弱**: 缺少文件树右键菜单的常用操作
- ⚠️ **快捷操作不够丰富**: 缺少 Quick Open、命令面板深度集成
- ⚠️ **首次体验可以更好**: 引导 Tour 缺失

### 13.3 总体评价

**MarkLite v0.9.0 是一款优秀的 Markdown 编辑器**，在核心编辑功能上已经非常成熟。主要提升空间在于**细节打磨和高级功能的完善**。

**推荐优先级**:
1. 用户体验细节（P1 列表）
2. 文件管理增强（P1 列表）
3. 高级功能完善（P2 列表）

---

**评估完成**: 2026-04-15  
**下次评估建议**: v0.10.0 发布后复评
