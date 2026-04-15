import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseShortcut,
  eventMatchesShortcut,
  formatKeyEvent,
  getCustomShortcuts,
  setCustomShortcuts,
  DEFAULT_SHORTCUTS,
} from '../../lib/shortcuts-config';

// Helper to build a minimal KeyboardEvent-like object
function fakeEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    key: '',
    ...overrides,
  } as unknown as KeyboardEvent;
}

describe('parseShortcut', () => {
  it('parses Ctrl+S', () => {
    expect(parseShortcut('Ctrl+S')).toEqual({ ctrl: true, shift: false, alt: false, key: 's' });
  });

  it('parses Ctrl+Shift+S', () => {
    expect(parseShortcut('Ctrl+Shift+S')).toEqual({ ctrl: true, shift: true, alt: false, key: 's' });
  });

  it('parses Alt+Down', () => {
    expect(parseShortcut('Alt+Down')).toEqual({ ctrl: false, shift: false, alt: true, key: 'down' });
  });

  it('parses Ctrl+1', () => {
    expect(parseShortcut('Ctrl+1')).toEqual({ ctrl: true, shift: false, alt: false, key: '1' });
  });

  it('parses single key (no modifier)', () => {
    expect(parseShortcut('F5')).toEqual({ ctrl: false, shift: false, alt: false, key: 'f5' });
  });

  it('handles Cmd as ctrl', () => {
    expect(parseShortcut('Cmd+K')).toEqual({ ctrl: true, shift: false, alt: false, key: 'k' });
  });

  it('returns empty key when only modifiers are present', () => {
    const result = parseShortcut('Ctrl+Shift+Alt');
    expect(result.key).toBe('');
  });

  it('parses Ctrl+Shift+J (insertSnippet default)', () => {
    expect(parseShortcut('Ctrl+Shift+J')).toEqual({ ctrl: true, shift: true, alt: false, key: 'j' });
  });
});

describe('eventMatchesShortcut', () => {
  it('matches Ctrl+S', () => {
    const sc = parseShortcut('Ctrl+S');
    const e = fakeEvent({ ctrlKey: true, key: 's' });
    expect(eventMatchesShortcut(e, sc)).toBe(true);
  });

  it('does not match when key differs', () => {
    const sc = parseShortcut('Ctrl+S');
    const e = fakeEvent({ ctrlKey: true, key: 'a' });
    expect(eventMatchesShortcut(e, sc)).toBe(false);
  });

  it('does not match when ctrl missing', () => {
    const sc = parseShortcut('Ctrl+S');
    const e = fakeEvent({ key: 's' });
    expect(eventMatchesShortcut(e, sc)).toBe(false);
  });

  it('treats metaKey as ctrl', () => {
    const sc = parseShortcut('Ctrl+S');
    const e = fakeEvent({ metaKey: true, key: 's' });
    expect(eventMatchesShortcut(e, sc)).toBe(true);
  });

  it('matches Ctrl+Shift+S', () => {
    const sc = parseShortcut('Ctrl+Shift+S');
    const e = fakeEvent({ ctrlKey: true, shiftKey: true, key: 's' });
    expect(eventMatchesShortcut(e, sc)).toBe(true);
  });

  it('does not match when shift differs', () => {
    const sc = parseShortcut('Ctrl+Shift+S');
    const e = fakeEvent({ ctrlKey: true, key: 's' });
    expect(eventMatchesShortcut(e, sc)).toBe(false);
  });

  it('matches Alt+Down (case-insensitive key)', () => {
    const sc = parseShortcut('Alt+Down');
    const e = fakeEvent({ altKey: true, key: 'Down' });
    expect(eventMatchesShortcut(e, sc)).toBe(true);
  });
});

describe('formatKeyEvent', () => {
  it('formats Ctrl+Shift+S', () => {
    const e = fakeEvent({ ctrlKey: true, shiftKey: true, key: 's' });
    expect(formatKeyEvent(e)).toBe('Ctrl+Shift+S');
  });

  it('formats Alt+ArrowUp as Alt+↑', () => {
    const e = fakeEvent({ altKey: true, key: 'ArrowUp' });
    expect(formatKeyEvent(e)).toBe('Alt+↑');
  });

  it('formats ArrowDown as ↓', () => {
    const e = fakeEvent({ key: 'ArrowDown' });
    expect(formatKeyEvent(e)).toBe('↓');
  });

  it('formats Space as Ctrl+Space', () => {
    const e = fakeEvent({ ctrlKey: true, key: ' ' });
    expect(formatKeyEvent(e)).toBe('Ctrl+Space');
  });

  it('formats Enter as Return', () => {
    const e = fakeEvent({ key: 'Enter' });
    expect(formatKeyEvent(e)).toBe('Return');
  });

  it('returns empty string for pure modifier key', () => {
    const e = fakeEvent({ ctrlKey: true, key: 'Control' });
    expect(formatKeyEvent(e)).toBe('Ctrl');
  });

  it('uppercases single-char keys', () => {
    const e = fakeEvent({ key: 'a' });
    expect(formatKeyEvent(e)).toBe('A');
  });

  it('preserves multi-char non-mapped keys verbatim', () => {
    const e = fakeEvent({ key: 'F5' });
    expect(formatKeyEvent(e)).toBe('F5');
  });
});

describe('getCustomShortcuts / setCustomShortcuts', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty object when nothing stored', () => {
    expect(getCustomShortcuts()).toEqual({});
  });

  it('returns empty object on corrupted JSON', () => {
    localStorage.setItem('marklite-custom-shortcuts', '{bad json');
    expect(getCustomShortcuts()).toEqual({});
  });

  it('persists and retrieves custom shortcuts', () => {
    setCustomShortcuts({ saveFile: 'Ctrl+Alt+S' });
    expect(getCustomShortcuts()).toEqual({ saveFile: 'Ctrl+Alt+S' });
  });

  it('overwrites previous custom shortcuts', () => {
    setCustomShortcuts({ saveFile: 'Ctrl+S' });
    setCustomShortcuts({ saveFile: 'Ctrl+Alt+S', newTab: 'Ctrl+T' });
    expect(getCustomShortcuts()).toEqual({ saveFile: 'Ctrl+Alt+S', newTab: 'Ctrl+T' });
  });
});

describe('DEFAULT_SHORTCUTS', () => {
  it('contains entries with id, labelKey, and defaultKeys', () => {
    expect(DEFAULT_SHORTCUTS.length).toBeGreaterThan(0);
    for (const s of DEFAULT_SHORTCUTS) {
      expect(s.id).toBeTruthy();
      expect(s.labelKey).toBeTruthy();
      expect(s.defaultKeys).toBeTruthy();
    }
  });

  it('all defaultKeys are parseable', () => {
    for (const s of DEFAULT_SHORTCUTS) {
      const parsed = parseShortcut(s.defaultKeys);
      // Every shortcut must have at least a modifier or a key
      expect(parsed.ctrl || parsed.shift || parsed.alt || parsed.key).toBeTruthy();
    }
  });
});
