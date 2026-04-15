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
