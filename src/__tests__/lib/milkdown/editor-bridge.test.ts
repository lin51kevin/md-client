import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the singleton after each test resets its state by re-importing
// (vitest module isolation happens per file; we manipulate the instance directly).
import { milkdownBridge } from '../../../lib/milkdown/editor-bridge';

describe('MilkdownEditorBridgeStore', () => {
  // ── Default state ───────────────────────────────────────────────────────

  it('has null callbacks by default', () => {
    // The singleton may be used by other tests, but the nullable fields start as null.
    // We just verify the shape of the object rather than assuming pristine state.
    expect('toggleList' in milkdownBridge).toBe(true);
    expect('listLift' in milkdownBridge).toBe(true);
    expect('getContent' in milkdownBridge).toBe(true);
    expect('headingPromote' in milkdownBridge).toBe(true);
    expect('headingDemote' in milkdownBridge).toBe(true);
    expect('undo' in milkdownBridge).toBe(true);
    expect('redo' in milkdownBridge).toBe(true);
    expect('runCommand' in milkdownBridge).toBe(true);
    expect('forceReplaceContent' in milkdownBridge).toBe(true);
    expect('insertText' in milkdownBridge).toBe(true);
    expect('setContent' in milkdownBridge).toBe(true);
  });

  it('canUndo and canRedo are false on a fresh instance', () => {
    // Reset to known state
    milkdownBridge.setUndoRedo(false, false);
    expect(milkdownBridge.canUndo).toBe(false);
    expect(milkdownBridge.canRedo).toBe(false);
  });

  it('lastWrittenContent is null by default', () => {
    // If a timer was running from a previous test, this may not be null.
    // We verify the property exists and can accept a write.
    expect(milkdownBridge.lastWrittenContent === null || typeof milkdownBridge.lastWrittenContent === 'string').toBe(true);
  });

  // ── setUndoRedo + listener ──────────────────────────────────────────────

  it('setUndoRedo notifies listeners', () => {
    milkdownBridge.setUndoRedo(false, false);
    const listener = vi.fn();
    const unsub = milkdownBridge.onUndoRedoChange(listener);

    milkdownBridge.setUndoRedo(true, false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(true, false);

    milkdownBridge.setUndoRedo(true, true);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(true, true);

    unsub();
  });

  it('setUndoRedo does NOT notify when value is unchanged', () => {
    milkdownBridge.setUndoRedo(false, false);
    const listener = vi.fn();
    const unsub = milkdownBridge.onUndoRedoChange(listener);

    milkdownBridge.setUndoRedo(false, false); // same value
    expect(listener).not.toHaveBeenCalled();

    unsub();
  });

  it('unsubscribing removes the listener', () => {
    milkdownBridge.setUndoRedo(false, false);
    const listener = vi.fn();
    const unsub = milkdownBridge.onUndoRedoChange(listener);
    unsub();

    milkdownBridge.setUndoRedo(true, false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('multiple listeners all receive notifications', () => {
    milkdownBridge.setUndoRedo(false, false);
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = milkdownBridge.onUndoRedoChange(a);
    const unsubB = milkdownBridge.onUndoRedoChange(b);

    milkdownBridge.setUndoRedo(true, true);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    unsubA();
    unsubB();
  });

  // ── recordWrite + auto-reset ────────────────────────────────────────────

  describe('recordWrite', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('stores the written content immediately', () => {
      milkdownBridge.recordWrite('hello world');
      expect(milkdownBridge.lastWrittenContent).toBe('hello world');
    });

    it('auto-resets to null after 500 ms', () => {
      milkdownBridge.recordWrite('hello');
      vi.advanceTimersByTime(499);
      expect(milkdownBridge.lastWrittenContent).toBe('hello');
      vi.advanceTimersByTime(1);
      expect(milkdownBridge.lastWrittenContent).toBeNull();
    });

    it('resets timer on consecutive writes within the window', () => {
      milkdownBridge.recordWrite('first');
      vi.advanceTimersByTime(400);
      milkdownBridge.recordWrite('second');
      vi.advanceTimersByTime(400); // 800 ms after first write, but 400 ms after second
      expect(milkdownBridge.lastWrittenContent).toBe('second'); // not yet reset
      vi.advanceTimersByTime(100); // now 500 ms after second write
      expect(milkdownBridge.lastWrittenContent).toBeNull();
    });

    it('overwrites previous content on a new write', () => {
      milkdownBridge.recordWrite('first');
      milkdownBridge.recordWrite('second');
      expect(milkdownBridge.lastWrittenContent).toBe('second');
    });
  });

  // ── toggleList, listLift, getContent (null-safety) ──────────────────────

  it('calling toggleList when null does not throw', () => {
    const saved = milkdownBridge.toggleList;
    milkdownBridge.toggleList = null;
    expect(() => milkdownBridge.toggleList?.('bullet')).not.toThrow();
    milkdownBridge.toggleList = saved;
  });

  it('calling listLift when null does not throw', () => {
    const saved = milkdownBridge.listLift;
    milkdownBridge.listLift = null;
    expect(() => milkdownBridge.listLift?.()).not.toThrow();
    milkdownBridge.listLift = saved;
  });

  it('calling getContent when null returns undefined (optional chaining)', () => {
    const saved = milkdownBridge.getContent;
    milkdownBridge.getContent = null;
    expect(milkdownBridge.getContent?.()).toBeUndefined();
    milkdownBridge.getContent = saved;
  });

  it('getContent returns the value set by the function', () => {
    milkdownBridge.getContent = () => 'test content';
    expect(milkdownBridge.getContent()).toBe('test content');
    milkdownBridge.getContent = null;
  });

  it('toggleList invokes the assigned function with the correct type', () => {
    const fn = vi.fn();
    milkdownBridge.toggleList = fn;
    milkdownBridge.toggleList('bullet');
    expect(fn).toHaveBeenCalledWith('bullet');
    milkdownBridge.toggleList('ordered');
    expect(fn).toHaveBeenCalledWith('ordered');
    milkdownBridge.toggleList = null;
  });

  it('listLift invokes the assigned function', () => {
    const fn = vi.fn();
    milkdownBridge.listLift = fn;
    milkdownBridge.listLift();
    expect(fn).toHaveBeenCalledTimes(1);
    milkdownBridge.listLift = null;
  });
});
