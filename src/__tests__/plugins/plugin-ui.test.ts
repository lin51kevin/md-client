import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUIAPI } from '../../plugins/plugin-ui';

describe('createUIAPI - showMessage', () => {
  let alertSpy: ReturnType<typeof vi.fn>;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;
  const capturedEvents: CustomEvent[] = [];

  beforeEach(() => {
    alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    capturedEvents.length = 0;
    dispatchSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation((e) => {
      capturedEvents.push(e as CustomEvent);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does NOT call window.alert', () => {
    const api = createUIAPI();
    api.showMessage('hello');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('dispatches a plugin:showMessage custom event', () => {
    const api = createUIAPI();
    api.showMessage('test message');
    expect(dispatchSpy).toHaveBeenCalledOnce();
    const event = capturedEvents[0];
    expect(event.type).toBe('plugin:showMessage');
  });

  it('event detail contains message and type', () => {
    const api = createUIAPI();
    api.showMessage('check this', 'warning');
    const event = capturedEvents[0];
    expect(event.detail).toEqual({ message: 'check this', type: 'warning' });
  });

  it('defaults type to "info" when not specified', () => {
    const api = createUIAPI();
    api.showMessage('plain message');
    const event = capturedEvents[0];
    expect(event.detail.type).toBe('info');
  });
});

describe('createUIAPI - showModal', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;
  const capturedEvents: CustomEvent[] = [];
  let registeredListeners: Map<string, EventListener>;

  beforeEach(() => {
    capturedEvents.length = 0;
    registeredListeners = new Map();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        registeredListeners.set(type, listener as EventListener);
      },
    );
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        registeredListeners.delete(type);
      },
    );
    dispatchSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation((e) => {
      capturedEvents.push(e as CustomEvent);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should dispatch plugin:showModal custom event', () => {
    const api = createUIAPI();
    // Call showModal but we won't resolve it — just check dispatch
    api.showModal({ title: 'Test', content: 'Hello' });
    const event = capturedEvents.find((e) => e.type === 'plugin:showModal');
    expect(event).toBeDefined();
  });

  it('should include title and content in event detail', () => {
    const api = createUIAPI();
    api.showModal({ title: 'My Title', content: 'Body text', type: 'confirm' });
    const event = capturedEvents.find((e) => e.type === 'plugin:showModal')!;
    expect(event.detail.title).toBe('My Title');
    expect(event.detail.content).toBe('Body text');
    expect(event.detail.type).toBe('confirm');
    expect(event.detail.resolve).toBeInstanceOf(Function);
  });

  it('should resolve promise when modal is closed via plugin:modalResult', async () => {
    const api = createUIAPI();
    const promise = api.showModal({ title: 'Confirm', content: 'Sure?' });

    // Simulate host resolving the modal with result=true
    const listener = registeredListeners.get('plugin:modalResult')!;
    listener(new CustomEvent('plugin:modalResult', { detail: { result: true } }));

    await expect(promise).resolves.toBe(true);
  });

  it('should resolve promise with false when user cancels', async () => {
    const api = createUIAPI();
    const promise = api.showModal({ title: 'Confirm', content: 'Sure?' });

    const listener = registeredListeners.get('plugin:modalResult')!;
    listener(new CustomEvent('plugin:modalResult', { detail: { result: false } }));

    await expect(promise).resolves.toBe(false);
  });

  it('should remove event listener after modal is closed', async () => {
    const api = createUIAPI();
    const promise = api.showModal({ title: 'Test', content: 'Test' });

    expect(registeredListeners.has('plugin:modalResult')).toBe(true);

    const listener = registeredListeners.get('plugin:modalResult')!;
    listener(new CustomEvent('plugin:modalResult', { detail: { result: true } }));

    await promise;
    expect(registeredListeners.has('plugin:modalResult')).toBe(false);
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
