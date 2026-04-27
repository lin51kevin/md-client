# 测试目录结构

所有测试文件已统一整理到 `src/__tests__` 目录下，按功能模块分类：

## 目录结构

```
src/
├── __tests__/          # 所有测试文件
│   ├── lib/           # lib 模块的测试
│   │   ├── autocomplete.test.ts
│   │   ├── auto-save.test.ts
│   │   ├── context-menu.test.ts
│   │   ├── html-export.test.ts
│   │   ├── image-paste.test.ts
│   │   ├── latex.test.ts
│   │   ├── markdown-extensions.test.ts
│   │   ├── mermaid.test.ts
│   │   ├── search.test.ts
│   │   ├── table-parser.test.ts
│   │   ├── text-format.test.ts
│   │   ├── theme-auto.test.ts
│   │   ├── theme.test.ts
│   │   ├── toc.test.ts
│   │   ├── version-history.test.ts
│   │   ├── vim-mode.test.ts
│   │   └── word-count.test.ts
│   ├── hooks/         # hooks 的测试
│   │   ├── useCursorPosition.test.ts
│   │   ├── useFileOps.test.ts
│   │   ├── useFocusMode.test.ts
│   │   ├── useImagePaste.test.ts
│   │   ├── useKeyboardShortcuts.test.ts
│   │   ├── useSearchHighlight.test.ts
│   │   ├── useTabs.test.ts
│   │   └── useWindowTitle.test.ts
│   └── components/    # 组件的测试
│       ├── FileTreeSidebar.test.tsx
│       ├── StatusBar.test.tsx
│       └── TabBar.test.tsx
├── lib/               # 实际的 lib 代码
├── hooks/             # 实际的 hooks 代码
├── components/        # 实际的组件代码
└── test-setup.ts      # 测试全局配置
```

## 测试配置

测试配置文件 `vitest.config.ts` 已更新为查找 `src/__tests__/**/*.test.{ts,tsx}`。

## 运行测试

```bash
# 运行所有测试
yarn test

# 运行特定模块的测试
yarn test src/__tests__/lib/
yarn test src/__tests__/hooks/
yarn test src/__tests__/components/

# 运行单个测试文件
yarn test src/__tests__/lib/autocomplete.test.ts

# 监听模式
yarn test:watch
```

## 测试覆盖

- **总测试文件**: 29 个
- **lib 测试**: 17 个
- **hooks 测试**: 9 个
- **组件测试**: 3 个

### 测试覆盖的功能

#### Lib 模块
- ✅ 自动补全 (autocomplete)
- ✅ 自动保存 (auto-save)
- ✅ 上下文菜单 (context-menu)
- ✅ HTML 导出 (html-export)
- ✅ 图片粘贴 (image-paste)
- ✅ LaTeX 支持 (latex)
- ✅ Markdown 扩展 (markdown-extensions)
- ✅ Mermaid 图表 (mermaid)
- ✅ 搜索功能 (search)
- ✅ 表格解析 (table-parser)
- ✅ 文本格式化 (text-format)
- ✅ 主题自动切换 (theme-auto)
- ✅ 主题管理 (theme)
- ✅ 目录生成 (toc)
- ✅ 版本历史 (version-history)
- ✅ Vim 模式 (vim-mode)
- ✅ 字数统计 (word-count)
- ✅ 写作统计 (writing-stats)

#### Hooks
- ✅ 光标位置追踪 (useCursorPosition)
- ✅ 文件操作 (useFileOps)
- ✅ 焦点模式 (useFocusMode)
- ✅ 图片粘贴 (useImagePaste)
- ✅ 键盘快捷键 (useKeyboardShortcuts)
- ✅ 搜索高亮 (useSearchHighlight)
- ✅ 标签管理 (useTabs)
- ✅ 窗口标题 (useWindowTitle)

#### 组件
- ✅ 文件树侧边栏 (FileTreeSidebar)
- ✅ 状态栏 (StatusBar)
- ✅ 标签栏 (TabBar)

## 编写新测试

在相应的目录下创建新的测试文件：

```typescript
// src/__tests__/lib/my-feature.test.ts
import { describe, it, expect } from 'vitest';
import { myFeature } from '../../lib/my-feature';

describe('myFeature', () => {
  it('should work correctly', () => {
    expect(myFeature()).toBe(expected);
  });
});
```

**注意**: 从测试文件导入源代码时，需要使用 `../../` 路径前缀，因为测试文件在 `__tests__` 子目录中。
