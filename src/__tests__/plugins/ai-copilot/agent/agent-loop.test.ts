import { describe, it, expect, vi } from 'vitest';
import { AgentLoop, buildAgentSystemPrompt } from '../../../../plugins/official/ai-copilot/src/agent/agent-loop';
import type { ToolDef, ToolExecutor } from '../../../../plugins/official/ai-copilot/src/tools/registry';

describe('AgentLoop', () => {
  const mockTools: ToolDef[] = [
    {
      name: 'search',
      description: 'Search in document',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'replace',
      description: 'Replace text',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  ];

  const mockExecutors: Record<string, ToolExecutor> = {
    async search(params, doc) {
      return { success: true, content: `Found: ${params.pattern}` };
    },
    async replace(params, doc) {
      return { success: true, content: 'Replaced' };
    },
  };

  describe('run', () => {
    it('returns immediately if AI returns no tool calls', async () => {
      const agent = new AgentLoop();
      const chatWithTools = vi.fn().mockResolvedValue({
        content: 'Done!',
        toolCalls: undefined,
      });

      const result = await agent.run(
        'Please help',
        'doc content',
        mockTools,
        mockExecutors,
        chatWithTools,
        'System prompt'
      );

      expect(result.done).toBe(true);
      expect(result.finalContent).toBe('Done!');
      expect(result.iterations).toBe(1);
      expect(chatWithTools).toHaveBeenCalledTimes(1);
    });

    it('executes tool calls and continues loop', async () => {
      const agent = new AgentLoop();
      const chatWithTools = vi.fn()
        .mockResolvedValueOnce({
          content: 'Let me search',
          toolCalls: [{ name: 'search', arguments: '{"pattern":"test"}' }],
        })
        .mockResolvedValueOnce({
          content: 'Found it!',
          toolCalls: undefined,
        });

      const result = await agent.run(
        'Find something',
        'doc content',
        mockTools,
        mockExecutors,
        chatWithTools
      );

      expect(result.done).toBe(true);
      expect(result.iterations).toBe(2);
      expect(result.toolCalls).toHaveLength(1);
      expect(chatWithTools).toHaveBeenCalledTimes(2);
    });

    it('handles multiple tool calls in one iteration', async () => {
      const agent = new AgentLoop();
      const chatWithTools = vi.fn()
        .mockResolvedValueOnce({
          content: 'Multiple operations',
          toolCalls: [
            { name: 'search', arguments: '{"pattern":"a"}' },
            { name: 'replace', arguments: '{"search":"old","replace":"new"}' },
          ],
        })
        .mockResolvedValueOnce({
          content: 'Done',
          toolCalls: undefined,
        });

      const result = await agent.run(
        'Do multiple things',
        'doc',
        mockTools,
        mockExecutors,
        chatWithTools
      );

      expect(result.toolCalls).toHaveLength(2);
    });

    it('handles unknown tool gracefully', async () => {
      const agent = new AgentLoop();
      const chatWithTools = vi.fn()
        .mockResolvedValueOnce({
          content: 'Using unknown tool',
          toolCalls: [{ name: 'unknown_tool', arguments: '{}' }],
        })
        .mockResolvedValueOnce({
          content: 'Recovered',
          toolCalls: undefined,
        });

      const result = await agent.run(
        'Test',
        'doc',
        mockTools,
        mockExecutors,
        chatWithTools
      );

      expect(result.done).toBe(true);
    });

    it('handles tool execution error', async () => {
      const errorExecutor: ToolExecutor = async () => {
        throw new Error('Tool failed');
      };

      const agent = new AgentLoop();
      const chatWithTools = vi.fn()
        .mockResolvedValueOnce({
          content: 'Trying tool',
          toolCalls: [{ name: 'search', arguments: '{}' }],
        })
        .mockResolvedValueOnce({
          content: 'Handled error',
          toolCalls: undefined,
        });

      const result = await agent.run(
        'Test',
        'doc',
        mockTools,
        { search: errorExecutor },
        chatWithTools
      );

      expect(result.done).toBe(true);
    });

    it('respects max iterations limit', async () => {
      const agent = new AgentLoop({ maxIterations: 3 });
      const chatWithTools = vi.fn().mockResolvedValue({
        content: 'Still working',
        toolCalls: [{ name: 'search', arguments: '{}' }],
      });

      const result = await agent.run(
        'Infinite loop test',
        'doc',
        mockTools,
        mockExecutors,
        chatWithTools
      );

      expect(result.done).toBe(false);
      expect(result.iterations).toBe(3);
      expect(chatWithTools).toHaveBeenCalledTimes(3);
    });
  });

  describe('buildAgentSystemPrompt', () => {
    it('includes all tool descriptions', () => {
      const prompt = buildAgentSystemPrompt(mockTools);

      expect(prompt).toContain('search');
      expect(prompt).toContain('replace');
      expect(prompt).toContain('Search in document');
      expect(prompt).toContain('Replace text');
    });

    it('includes usage rules', () => {
      const prompt = buildAgentSystemPrompt(mockTools);

      expect(prompt).toContain('规则');
      expect(prompt).toContain('行号都是 1-indexed');
    });
  });
});