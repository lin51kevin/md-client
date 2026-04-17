import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import type { Command } from '../lib/commands';
import { searchCommands, recordCommandExecution, CATEGORY_LABELS } from '../lib/commands';

interface CommandPaletteProps {
  visible: boolean;
  commands: Command[];
  onClose: () => void;
  locale: string; // 'zh-CN' | 'en'
}

export function CommandPalette({ visible, commands, onClose, locale }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isZh = locale === 'zh-CN';
  const catLabel = (key: string) => (isZh ? CATEGORY_LABELS[key]?.zh : CATEGORY_LABELS[key]?.en) || key;

  const filteredCommands = useMemo(
    () => searchCommands(query, commands),
    [query, commands]
  );

  // Group commands by category, preserving order within each group
  const grouped = useMemo(() => {
    const groups: { category: string; items: Command[] }[] = [];
    let currentCategory = '';
    for (const cmd of filteredCommands) {
      if (cmd.category !== currentCategory) {
        currentCategory = cmd.category;
        groups.push({ category: cmd.category, items: [cmd] });
      } else {
        groups[groups.length - 1].items.push(cmd);
      }
    }
    return groups;
  }, [filteredCommands]);

  // Reset state on open
  useLayoutEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [visible]);

  // Clamp selectedIndex when results change
  useEffect(() => {
    if (filteredCommands.length === 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(i => Math.min(i, filteredCommands.length - 1));
    }
  }, [filteredCommands.length]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const executeCommand = useCallback((cmd: Command) => {
    recordCommandExecution(cmd.id);
    cmd.action();
    onClose();
  }, [onClose]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) executeCommand(selected);
        break;
      }
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, executeCommand, onClose]);

  if (!visible) return null;

  let globalIndex = -1;

  return (
    <div className="command-palette-overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="command-palette" role="dialog" aria-modal="true" aria-label={isZh ? '命令面板' : 'Command Palette'}>
        <div className="command-palette-search">
          <span className="command-palette-search-icon">⌘</span>
          <input
            ref={inputRef}
            className="command-palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isZh ? '输入命令搜索...' : 'Type a command...'}
          />
        </div>

        <div className="command-palette-list" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">
              {isZh ? '无匹配命令' : 'No matching commands'}
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.category}>
                <div className="command-group-header">{catLabel(group.category)}</div>
                {group.items.map(cmd => {
                  globalIndex++;
                  const idx = globalIndex;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      data-selected={isSelected || undefined}
                      className={`command-item ${isSelected ? 'command-item-selected' : ''}`}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="command-item-label">{cmd.label}</span>
                      {cmd.shortcut && (
                        <span className="command-item-shortcut">{cmd.shortcut}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="command-palette-footer">
          <span>↑↓ {isZh ? '导航' : 'navigate'}</span>
          <span>↵ {isZh ? '执行' : 'execute'}</span>
          <span>Esc {isZh ? '关闭' : 'close'}</span>
        </div>
      </div>
    </div>
  );
}
