# MarkLite 插件开发指南

> **最后更新**：2026-04-16
> **MarkLite 版本**：v0.9.2 (当前版本)
> **本指南包含**：插件创建、manifest 配置、API 参考、权限模型、发布流程

---

## 快速开始

### 1. 创建插件项目

```bash
node scripts/create-marklite-plugin/create-plugin.js
```

交互式脚手架会引导你填写插件名、描述、权限等信息，自动生成项目模板。

### 2. manifest.json 字段说明

每个插件根目录必须包含 `manifest.json`：

| 字段 | 必填 | 说明 |
|------|------|------|
| id | ✅ | 唯一标识，如 `my-awesome-plugin` |
| name | ✅ | 显示名称 |
| version | ✅ | 语义化版本 |
| main | ✅ | 入口文件路径（相对于插件根目录） |
| activationEvents | ✅ | 激活事件数组 |
| permissions | ✅ | 所需权限列表 |
| engines | ❌ | 最低 MarkLite 版本要求，如 `{ "marklite": ">=0.7.0" }` |

**示例：**

```json
{
  "id": "my-backlinks",
  "name": "My Backlinks",
  "version": "1.0.0",
  "main": "src/index.ts",
  "activationEvents": ["onStartup"],
  "permissions": ["workspace", "sidebar.panel"]
}
```

### 3. 激活事件（Activation Events）

插件通过 `activationEvents` 声明何时激活：

```typescript
'onStartup'        // 应用启动时
'onFileOpen'       // 任意文件打开时
'onWorkspaceReady' // 工作区就绪时
'onCommand:xxx'    // 特定命令触发时
```

- 支持多事件：`["onStartup", "onFileOpen"]`
- 按需激活可减少启动开销，建议只声明必要事件

### 4. 权限参考

| 权限 | 级别 | 说明 |
|------|------|------|
| `file.read` | low | 读取工作区文件 |
| `file.write` | high | 写入文件（需用户确认） |
| `workspace` | medium | 访问工作区信息 |
| `editor.read` | medium | 读取编辑器内容 |
| `editor.write` | high | 修改编辑器内容 |
| `sidebar.panel` | medium | 注册侧边栏面板 |
| `commands` | low | 注册自定义命令 |

- **low**：自动授予，无需确认
- **medium**：首次使用时弹窗确认
- **high**：每次操作前需用户确认

### 5. API 参考

插件通过 `activate(ctx: PluginContext)` 接收上下文对象。

#### context.commands — 命令注册

```typescript
const disp = ctx.commands.register('my.hello', () => {
  console.log('Hello from plugin!');
});
// disp.dispose(); // 插件卸载时调用
```

#### context.workspace — 工作区操作

```typescript
const files = ctx.workspace.getAllFiles();
ctx.workspace.openFile('/path/to/file.md');
ctx.workspace.onFileChanged((file) => {
  console.log('File changed:', file.path);
});
```

#### context.editor — 编辑器操作

```typescript
const content = ctx.editor.getContent();
ctx.editor.insertText('Hello', fromPos, toPos);
```

#### context.sidebar — 侧边栏面板

```typescript
const panel = ctx.sidebar.registerPanel('my-panel', {
  title: 'My Panel',
  render: () => createMyPanelElement(),
});
// panel.dispose(); // 卸载面板
```

#### context.storage — 持久化存储

```typescript
await ctx.storage.set('key', 'value');
const val = await ctx.storage.get('key');
await ctx.storage.delete('key');
```

### 6. 示例：创建 Backlinks 面板插件

```typescript
// src/index.ts
import type { PluginContext } from '@marklite/plugin-api';

export function activate(ctx: PluginContext) {
  const panel = ctx.sidebar.registerPanel('my-backlinks', {
    title: 'Backlinks',
    render: () => {
      const el = document.createElement('div');
      el.textContent = 'Looking for backlinks...';
      return el;
    },
  });

  // 可选：监听文件变化更新面板
  ctx.workspace.onFileChanged(() => {
    panel.update(); // 触发重新 render
  });

  return { deactivate: () => panel.dispose() };
}
```

### 7. 占位符变量

Snippet Manager 插件支持以下占位符（在代码片段中使用）：

```
{{date}}     → 当前日期（YYYY-MM-DD）
{{time}}     → 当前时间（HH:MM:SS）
{{datetime}} → 日期时间组合
{{cursor}}   → 插入后光标停留位置
```

### 8. 调试技巧

- **插件加载失败？** 在 DevTools 控制台查看 `[PluginHost]` 开头的警告信息
- **权限不足？** 检查 `manifest.json` 的 `permissions` 字段是否完整
- **快速调试**：用 `window.alert()` 或 `console.log()` 在插件代码中输出日志
- **热重载**：修改插件源码后，在插件面板中点击「重新加载」按钮

### 9. 发布插件

1. **创建 GitHub 仓库**，按上述目录结构组织代码
2. **将 `manifest.json` 放到公开 URL**（或直接从仓库根目录引用）
3. **在 MarkLite 社区提交插件信息**，包含仓库地址和简要说明

### 10. 内置插件参考

MarkLite 自带三个官方插件，可作为开发参考：

| 插件 | 路径 | 功能 |
|------|------|------|
| Backlinks | `src/plugins/official/backlinks/` | 反向链接面板 |
| Graph View | `src/plugins/official/graph-view/` | 知识图谱可视化 |
| Snippet Manager | `src/plugins/official/snippet-manager/` | 代码片段管理 |
