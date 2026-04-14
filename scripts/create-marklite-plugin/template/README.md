# {{pluginName}}

{{pluginDescription}}

## 开发

```bash
yarn install
yarn dev
```

## 目录结构

- `src/index.ts` — 插件入口，导出 `activate` 函数
- `src/MyPluginPanel.tsx` — 面板 UI 组件
- `manifest.json` — 插件元数据

## Plugin API

插件通过 `activate(context: PluginContext)` 激活，context 提供：

- `context.commands.register(id, handler)` — 注册命令
- `context.sidebar.registerPanel(id, { title, render })` — 注册侧边栏面板

更多 API 请参考 `@marklite/plugin-api` 类型定义。

## 构建

```bash
yarn build
```

产物输出到 `dist/`。
