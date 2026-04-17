import type { ToolDef, ToolExecutor } from "../tools/registry";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string; // for tool responses
}

export interface ToolCall {
  name: string;
  arguments: string; // JSON string
}

export interface AgentResult {
  done: boolean;
  finalContent: string;
  iterations: number;
  toolCalls: ToolCall[];
}

export interface AgentOptions {
  maxIterations?: number;
  systemPrompt?: string;
}

const DEFAULT_MAX_ITERATIONS = 10;
const MAX_DOC_PREVIEW_LENGTH = 2000;

/**
 * AI Agent Loop - Core engine for tool-based editing
 *
 * DIAG-001 Fix: toolCalls is now declared inside run() to prevent accumulation
 * across multiple calls. Previously it was a class field that grew unbounded.
 *
 * @example
 * ```typescript
 * const agent = new AgentLoop({ maxIterations: 5 });
 * const result = await agent.run(message, content, tools, executors, chatWithTools);
 * // toolCalls is fresh for each run() call
 * ```
 */
export class AgentLoop {
  private maxIterations: number;

  constructor(options: AgentOptions = {}) {
    this.maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  }

  /**
   * Execute the agent loop with tool calling
   *
   * DIAG-001 Fix: toolCalls is declared fresh inside each iteration to prevent
   * stale accumulation. Additionally, the overall toolCalls accumulator is
   * scoped to this run() call only — never a class field.
   */
  async run(
    userMessage: string,
    docContent: string,
    tools: ToolDef[],
    executors: Record<string, ToolExecutor>,
    chatWithTools: (
      messages: ChatMessage[],
      tools: ToolDef[]
    ) => Promise<{ content: string; toolCalls?: ToolCall[] }>,
    systemPrompt?: string
  ): Promise<AgentResult> {
    // DIAG-001 Fix: Fresh array scoped to this run() — never leaks across calls
    // Note: Array mutation is acceptable here for performance in local accumulator
    const toolCalls: ToolCall[] = [];

    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({
      role: "user",
      content: `${userMessage}\n\n当前文档内容:\n${docContent.slice(0, MAX_DOC_PREVIEW_LENGTH)}${docContent.length > MAX_DOC_PREVIEW_LENGTH ? "..." : ""}`,
    });

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      // Call AI with tools
      const aiResponse = await chatWithTools(messages, tools);

      // DIAG-001: Fresh array per iteration — prevents stale tool calls from accumulating
      const iterToolCalls: ToolCall[] = aiResponse.toolCalls ?? [];

      // AI returned text without tool calls -> done
      if (iterToolCalls.length === 0) {
        return {
          done: true,
          finalContent: aiResponse.content,
          iterations: iteration + 1,
          toolCalls, // Return the local array
        };
      }

      // Add AI response to messages
      messages.push({
        role: "assistant",
        content: aiResponse.content || "我将使用工具来完成这个任务。",
      });

      // Execute each tool call (iterToolCalls is fresh per iteration)
      for (const toolCall of iterToolCalls) {
        toolCalls.push(toolCall); // Push to run-scoped accumulator

        const executor = executors[toolCall.name];
        if (!executor) {
          messages.push({
            role: "tool",
            name: toolCall.name,
            content: `错误：未知工具 "${toolCall.name}"`,
          });
          continue;
        }

        try {
          const args = JSON.parse(toolCall.arguments);
          const result = await executor(args, docContent);
          messages.push({
            role: "tool",
            name: toolCall.name,
            content: result.success
              ? `结果：\n${result.content}`
              : `错误：${result.error || "执行失败"}`,
          });
        } catch (err) {
          messages.push({
            role: "tool",
            name: toolCall.name,
            content: `执行错误：${String(err)}`,
          });
        }
      }
    }

    // Max iterations reached
    return {
      done: false,
      finalContent: "Agent 在达到最大迭代次数后结束",
      iterations: this.maxIterations,
      toolCalls, // Return the local array
    };
  }
}

/**
 * Build system prompt with tool descriptions
 */
export function buildAgentSystemPrompt(tools: ToolDef[]): string {
  const toolDescriptions = tools
    .map(
      (t) =>
        `- ${t.name}: ${t.description}\n  参数: ${JSON.stringify(t.parameters)}`
    )
    .join("\n");

  return `你是一个 Markdown 文档编辑助手。你可以使用以下工具来精确修改文档：

${toolDescriptions}

规则：
1. 先使用 search 或 get_outline 了解文档结构
2. 使用 replace、replace_lines 或 insert 进行精确修改
3. 每次修改后观察结果，决定是否需要继续
4. 完成后返回最终结果

注意：
- 行号都是 1-indexed（从1开始）
- 尽量做出最小的必要修改
- 如果修改涉及多个位置，使用多次工具调用`;
}
