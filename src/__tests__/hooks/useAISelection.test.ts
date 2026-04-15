import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAISelection } from '../../hooks/useAISelection';
import { renderHook, act } from '@testing-library/react';
import type { AIAction } from '../../hooks/useAISelection';

describe('useAISelection', () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  const actions: AIAction[] = ['polish', 'explain', 'translate', 'summarize', 'rewrite'];

  for (const action of actions) {
    it(`should call API with correct system prompt for ${action}`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: `result-${action}` } }] }),
      });

      const onResult = vi.fn();
      const { result } = renderHook(() =>
        useAISelection({
          apiEndpoint: 'https://api.test.com/v1',
          apiKey: 'test-key',
          onResult,
        })
      );

      await act(async () => {
        await result.current.processSelection('hello world', action);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toBe('hello world');
      expect(onResult).toHaveBeenCalledWith(`result-${action}`);
    });
  }

  it('should show loading state during API call', async () => {
    let resolvePromise: (value: any) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolvePromise = r; }));

    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useAISelection({
        apiEndpoint: 'https://api.test.com/v1',
        apiKey: 'test-key',
        onResult,
      })
    );

    expect(result.current.loading).toBe(false);

    let promise: Promise<void>;
    act(() => {
      promise = result.current.processSelection('test', 'polish');
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise!({ ok: true, json: async () => ({ choices: [{ message: { content: 'done' } }] }) });
      await promise!;
    });

    expect(result.current.loading).toBe(false);
  });

  it('should set error state on API failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' });

    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useAISelection({
        apiEndpoint: 'https://api.test.com/v1',
        apiKey: 'bad-key',
        onResult,
      })
    );

    await act(async () => {
      await result.current.processSelection('test', 'polish');
    });

    expect(result.current.error).toBeTruthy();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('should support streaming via onChunk callback', async () => {
    const chunks = ['Hello', ' World', '!'];
    let chunkIndex = 0;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => {
          return {
            read: () => {
              if (chunkIndex >= chunks.length) return Promise.resolve({ done: true });
              const chunk = chunks[chunkIndex++];
              const data = `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`;
              return Promise.resolve({ done: false, value: new TextEncoder().encode(data) });
            },
          };
        },
      },
    });

    const onResult = vi.fn();
    const onChunk = vi.fn();
    const { result } = renderHook(() =>
      useAISelection({
        apiEndpoint: 'https://api.test.com/v1',
        apiKey: 'test-key',
        onResult,
        onChunk,
      })
    );

    await act(async () => {
      await result.current.processSelection('test', 'polish');
    });

    expect(onResult).toHaveBeenCalledWith('Hello World!');
    expect(onChunk).toHaveBeenCalledTimes(3);
  });

  it('should clear error on new request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Error' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });

    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useAISelection({
        apiEndpoint: 'https://api.test.com/v1',
        apiKey: 'test-key',
        onResult,
      })
    );

    await act(async () => {
      await result.current.processSelection('test', 'polish');
    });
    expect(result.current.error).toBeTruthy();

    await act(async () => {
      await result.current.processSelection('test', 'polish');
    });
    expect(result.current.error).toBeNull();
  });
});
