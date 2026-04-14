# AI 辅助编辑系统设计方案
## MarkLite - 智能 Markdown 编辑器

**版本**: v1.0  
**创建日期**: 2026-04-14  
**参考**: VS Code Copilot Chat  

---

## 🎯 系统目标

1. **智能对话编辑** - 通过自然语言对话快速修改文档
2. **意图解析执行** - 后端 LLM 解析用户意图，自动执行编辑操作
3. **上下文感知** - 理解当前文档结构和光标位置
4. **多模态交互** - 支持文本、命令、快捷操作

---

## 🏗️ 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                         UI 交互层                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌━━━━━━━━━━━━━━━━━━━━━━━━━┐  │
│  │  Activity   │  │   Editor    │  │   🤖 AI Chat Panel       │  │
│  │    Bar      │  │   Area      │  │   (Copilot Chat Style)  │  │
│  │             │  │             │  │                          │  │
│  │ [📁][🔍][🤖]│  │             │  │  ┌──────────────────┐   │  │
│  │             │  │  ┌────────┐ │  │  │  User: 把这段     │   │  │
│  │             │  │  │Content │ │  │  │  改为列表         │   │  │
│  │             │  │  │        │ │  │  └──────────────────┘   │  │
│  │             │  │  └────────┘ │  │  ┌──────────────────┐   │  │
│  │             │  │             │  │  │  🤖 AI: 已为您    │   │  │
│  │             │  │             │  │  │  转换为无序列表   │   │  │
│  └─────────────┘  └─────────────┘  │  └──────────────────┘   │  │
│                                    │  ┌──────────────────┐   │  │
│                                    │  │ [✓接受] [✗拒绝] │   │  │
│                                    │  └──────────────────┘   │  │
│                                    └━━━━━━━━━━━━━━━━━━━━━━━━━┘  │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       AI 服务层                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Intent Parser │  │   Edit Engine   │  │   LLM Client    │  │
│  │                 │  │                 │  │                 │  │
│  │ - 意图识别      │  │ - 文本生成      │  │ - OpenAI API    │  │
│  │ - 参数提取      │  │ - Diff 计算     │  │ - Claude API    │  │
│  │ - Action 路由   │  │ - 变更预览      │  │ - Local Model   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 核心组件清单

| 组件 | 文件路径 | 说明 |
|------|----------|------|
| AIChatPanel | `src/components/AIChatPanel.tsx` | 主聊天面板 |
| AIChatInput | `src/components/AIChatInput.tsx` | 智能输入框 |
| MessageBubble | `src/components/MessageBubble.tsx` | 消息气泡 |
| EditPreview | `src/components/EditPreview.tsx` | 编辑预览 |
| useAIChat | `src/hooks/useAIChat.ts` | AI 聊天状态管理 |
| aiService | `src/services/ai/index.ts` | AI 服务统一入口 |
| intentParser | `src/services/ai/intentParser.ts` | 意图解析 |
| editEngine | `src/services/ai/editEngine.ts` | 编辑引擎 |
| aiConfig | `src/config/ai.ts` | AI 配置管理 |

---

## 🎨 UI 设计规范

### 颜色方案
```css
/* AI 聊天面板主题色 */
--ai-primary: #6366f1;        /* 主色调 - 紫色 */
--ai-primary-hover: #4f46e5;  /* 悬停 */
--ai-bg: #ffffff;             /* 背景 */
--ai-header-bg: #f8fafc;      /* 头部背景 */
--ai-message-user: #eff6ff;   /* 用户消息 */
--ai-message-ai: #f8fafc;     /* AI 消息 */
--ai-border: #e2e8f0;         /* 边框 */
--ai-text: #1e293b;           /* 文字 */
--ai-text-secondary: #64748b; /* 次要文字 */
```

### 尺寸规范
- 面板宽度: 380px (可调整)
- 消息气泡最大宽度: 85%
- 头像尺寸: 28px
- 输入框高度: 自适应 (最小 44px)
- 快速命令按钮: 自动换行

---

## 🚀 实施计划

### Phase 1: 基础框架 (Week 1)

#### Day 1-2: 组件框架搭建
```bash
# 创建组件文件
touch src/components/AIChatPanel.tsx
touch src/components/AIChatInput.tsx
touch src/components/MessageBubble.tsx
touch src/hooks/useAIChat.ts
touch src/services/ai/index.ts
```

**任务清单**:
- [ ] 创建 ActivityBar AI 按钮
- [ ] 实现 AIChatPanel 基础布局
- [ ] 集成到 SidebarContainer
- [ ] 添加 PanelId 类型

#### Day 3-4: 消息系统
- [ ] 实现消息列表渲染
- [ ] 用户输入与发送
- [ ] 消息历史管理
- [ ] 自动滚动到底部

#### Day 5: 快速命令
- [ ] 快速命令按钮组
- [ ] 常见编辑场景预设
- [ ] 国际化支持

### Phase 2: AI 服务集成 (Week 2)

#### Day 1-2: LLM 客户端
```typescript
// src/services/ai/llmClient.ts
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  baseURL?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class LLMClient {
  async chat(messages: Message[], config: LLMConfig): Promise<string>;
  async stream(messages: Message[], config: LLMConfig): AsyncIterable<string>;
}
```

**任务清单**:
- [ ] 配置管理界面
- [ ] OpenAI API 集成
- [ ] 流式响应支持
- [ ] 错误处理

#### Day 3-4: 意图解析
- [ ] 规则匹配引擎
- [ ] LLM 意图识别
- [ ] 参数提取
- [ ] Action 路由

#### Day 5: 编辑引擎
- [ ] 文本生成
- [ ] Diff 计算
- [ ] 变更预览
- [ ] 应用/拒绝逻辑

### Phase 3: 高级功能 (Week 3)

#### Day 1-2: 上下文管理
- [ ] 文档上下文获取
- [ ] 选区上下文
- [ ] 段落上下文
- [ ] 上下文压缩 (Token 优化)

#### Day 3-4: 编辑预览
- [ ] Diff 可视化
- [ ] 行内预览
- [ ] 批量应用
- [ ] 撤销支持

#### Day 5: 快捷操作
- [ ] 命令面板集成
- [ ] 快捷键绑定
- [ ] 右键菜单
- [ ] 悬浮操作按钮

### Phase 4: 优化与完善 (Week 4)

#### Day 1-2: 性能优化
- [ ] 消息列表虚拟化
- [ ] AI 响应缓存
- [ ] 防抖优化
- [ ] 内存管理

#### Day 3-4: 用户体验
- [ ] 加载动画
- [ ] 空状态设计
- [ ] 错误提示优化
- [ ] 新手引导

#### Day 5: 测试与文档
- [ ] 单元测试
- [ ] 集成测试
- [ ] 使用文档
- [ ] 示例教程

---

## 📋 具体功能清单

### Chat 功能
- [x] 消息列表显示
- [x] 用户输入发送
- [x] 流式响应显示
- [x] Markdown 渲染
- [x] 代码块高亮
- [x] 复制消息
- [ ] 消息搜索
- [ ] 导出对话

### 编辑功能
- [x] 文本改进
- [x] 翻译
- [x] 总结
- [x] 格式化
- [x] 语法修正
- [x] 扩写/缩写
- [ ] 风格转换
- [ ] 续写

### 交互功能
- [x] 接受/拒绝编辑
- [x] 批量应用
- [ ] 撤销/重做
- [ ] 对比视图
- [ ] 行内编辑
- [ ] 智能提示

### 其他功能
- [ ] 本地模型支持
- [ ] Prompt 自定义
- [ ] 编辑历史
- [ ] Token 使用统计
- [ ] 多轮对话上下文

---

## 🔧 技术要点

### 1. 编辑器集成

```typescript
// 获取编辑器上下文
function getEditorContext(cmView: EditorView): EditorContext {
  const state = cmView.state;
  const selection = state.selection.main;
  
  return {
    fullDocument: state.doc.toString(),
    selectedText: selection.empty ? '' : state.doc.sliceString(selection.from, selection.to),
    cursorPosition: selection.from,
    currentLine: state.doc.lineAt(selection.from).text,
    language: detectLanguage(state.doc.toString()),
  };
}

// 应用编辑建议
function applyEditSuggestion(view: EditorView, suggestion: EditSuggestion) {
  view.dispatch({
    changes: {
      from: suggestion.range.from,
      to: suggestion.range.to,
      insert: suggestion.suggestedText,
    },
    selection: {
      anchor: suggestion.range.from + suggestion.suggestedText.length,
    },
  });
}
```

### 2. Prompt 工程

```typescript
// 系统 Prompt 模板
const EDIT_SYSTEM_PROMPT = `你是一个专业的 Markdown 编辑器 AI 助手。

你的任务是帮助用户编辑和改进 Markdown 文档。

规则：
1. 仔细理解用户的意图
2. 只修改用户选中的内容或上下文相关部分
3. 保持 Markdown 格式规范
4. 提供简洁明了的解释
5. 如果建议涉及编辑，使用 
{{EDIT_START}}
[建议的修改内容]
{{EDIT_END}}
标记

当前文档语言: {language}
选区内容: {selection}
`;

// 生成编辑提示
function generateEditPrompt(context: EditorContext, userRequest: string): string {
  return `请帮我编辑以下内容：

${context.selectedText || context.currentLine}

要求：${userRequest}

请直接给出修改后的内容。`;
}
```

### 3. 流式响应处理

```typescript
function useStreamingResponse() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const startStreaming = useCallback(async (prompt: string) => {
    setIsStreaming(true);
    setContent('');
    
    const stream = await aiService.streamChat(prompt);
    
    for await (const chunk of stream) {
      setContent(prev => prev + chunk);
    }
    
    setIsStreaming(false);
  }, []);
  
  return { content, isStreaming, startStreaming };
}
```

---

## 📁 文件变更计划

### 新增文件
```
src/
├── components/
│   ├── AIChatPanel.tsx        # 主面板
│   ├── AIChatInput.tsx        # 输入组件
│   ├── MessageBubble.tsx      # 消息气泡
│   ├── EditPreview.tsx        # 编辑预览
│   └── QuickCommands.tsx      # 快速命令
├── hooks/
│   ├── useAIChat.ts           # AI 聊天 Hook
│   └── useAIConfig.ts         # AI 配置 Hook
├── services/
│   └── ai/
│       ├── index.ts           # 服务入口
│       ├── llmClient.ts       # LLM 客户端
│       ├── intentParser.ts    # 意图解析
│       ├── editEngine.ts      # 编辑引擎
│       └── promptTemplates.ts # Prompt 模板
├── config/
│   └── ai.ts                  # AI 配置
└── types/
    └── ai.ts                  # AI 类型定义
```

### 修改文件
```
src/
├── components/
│   └── ActivityBar.tsx        # 添加 AI 按钮
├── App.tsx                    # 集成 AI Panel
├── i18n/
│   ├── zh-CN.ts               # 添加中文翻译
│   └── en.ts                  # 添加英文翻译
└── types.ts                   # 添加 AI 相关类型
```

---

## 🎨 界面预览

```
┌────────────────────────────────────────────────────────────────┐
│  MarkLite                                        [🤖] [⚙️] [_] [X]│
├────┬──────────────────────────────────────────┬────────────────┤
│    │                                          │  🤖 AI 助手     │
│ 📁 │  ## 欢迎使用 MarkLite                    ├────────────────┤
│    │                                          │                │
│ 🔍 │  这是一个 Markdown 编辑器。              │  ✨ 快速操作    │
│    │                                          │  ┌──┬──┬──┐   │
│ 🤖 │  [选中了这段文字]                        │  │改│翻│总│   │
│    │                                          │  │进│译│结│   │
│ 🌿 │                                          │  └──┴──┴──┘   │
│    │                                          │                │
│ ⚙️ │                                          │  ───────────── │
│    │                                          │  👤 把这段总结 │
│    │                                          │  一下          │
│    │                                          │                │
│    │                                          │  ───────────── │
│    │                                          │  🤖 已为您总结:│
│    │                                          │                │
│    │                                          │  [摘要内容...] │
│    │                                          │                │
│    │                                          │  [✓] [✗] [📝]│
│    │                                          │                │
│    │                                          │  ───────────── │
│    │                                          │  [________] [➤]│
│    │                                          │   输入指令...  │
└────┴──────────────────────────────────────────┴────────────────┘
```

---

## 🔐 配置示例

```typescript
// src/config/ai.ts
export const AI_CONFIG = {
  // 默认提供商
  defaultProvider: 'openai' as const,
  
  // 提供商配置
  providers: {
    openai: {
      name: 'OpenAI',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      defaultModel: 'gpt-4o-mini',
    },
    anthropic: {
      name: 'Anthropic',
      models: ['claude-3-5-sonnet', 'claude-3-haiku'],
      defaultModel: 'claude-3-haiku',
    },
    local: {
      name: 'Local',
      models: ['llama3', 'qwen2'],
      defaultModel: 'llama3',
    },
  },
  
  // 默认参数
  defaults: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  
  // 功能开关
  features: {
    streaming: true,
    codeHighlight: true,
    editPreview: true,
    quickCommands: true,
  },
};
```

---

## 📊 预期效果

| 功能 | 预期效果 |
|------|----------|
| 文本改进 | 选中段落一键优化表达 |
| 翻译 | 中英互译保留 Markdown 格式 |
| 总结 | 长文一键生成摘要 |
| 格式化