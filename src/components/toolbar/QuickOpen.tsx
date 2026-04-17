/**
 * Quick Open File (Ctrl+P)
 *
 * VS Code-style file quick open: fuzzy search across all files in the workspace,
 * with recent files prioritized. Uses Tauri backend for file listing.
 */
import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { File, Clock, Search } from 'lucide-react';
import type { DirEntry } from './FileTreeSidebar';
import type { RecentFile } from '../lib/recent-files';

interface QuickOpenProps {
  visible: boolean;
  onClose: () => void;
  onFileOpen: (filePath: string) => void;
  fileTreeRoot: string;
  recentFiles: RecentFile[];
  locale: string;
}

interface FileItem {
  name: string;
  path: string;
  relativePath: string;
  isRecent: boolean;
}

/** Flatten a DirEntry tree into a list of file items */
function flattenFiles(entry: DirEntry, rootPath: string): FileItem[] {
  const results: FileItem[] = [];
  const queue: DirEntry[] = entry.children ? [...entry.children] : [];

  while (queue.length > 0) {
    const node = queue.pop()!;
    if (node.is_file) {
      const rel = node.path.replace(rootPath, '').replace(/^[\\/]+/, '');
      results.push({ name: node.name, path: node.path, relativePath: rel, isRecent: false });
    }
    if (node.children) {
      for (const child of node.children) queue.push(child);
    }
  }
  return results;
}

/** Fuzzy match: substring on name or relative path */
function fuzzyMatch(query: string, item: FileItem): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (item.name.toLowerCase().includes(q)) return true;
  if (item.relativePath.toLowerCase().includes(q)) return true;
  return false;
}

/** Score: exact name > prefix > substring; recent files boosted */
function scoreItem(query: string, item: FileItem, recentPaths: Set<string>): number {
  let score = 0;
  const q = query.toLowerCase().trim();
  const name = item.name.toLowerCase();

  if (name === q) score += 1000;
  else if (name.startsWith(q)) score += 500;
  else if (name.includes(q)) score += 200;

  if (recentPaths.has(item.path)) score += 300;
  score -= item.relativePath.length * 0.1;
  return score;
}

export function QuickOpen({ visible, onClose, onFileOpen, fileTreeRoot, recentFiles, locale }: QuickOpenProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isZh = locale === 'zh-CN';

  const recentPaths = useMemo(() => new Set(recentFiles.map(f => f.path)), [recentFiles]);

  // Load file tree when opened
  useEffect(() => {
    if (!visible || !fileTreeRoot) return;
    let cancelled = false;
    setLoading(true);

    invoke<DirEntry>('read_dir_recursive', { path: fileTreeRoot, depth: 6 })
      .then(tree => {
        if (cancelled) return;
        const files = flattenFiles(tree, fileTreeRoot);
        // Mark recent
        const marked = files.map(f => ({ ...f, isRecent: recentPaths.has(f.path) }));
        setAllFiles(marked);
      })
      .catch(() => {
        if (!cancelled) setAllFiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [visible, fileTreeRoot, recentPaths]);

  // Filtered + scored results
  const filteredFiles = useMemo(() => {
    const matched = allFiles.filter(f => fuzzyMatch(query, f));
    return matched.sort((a, b) => scoreItem(query, b, recentPaths) - scoreItem(query, a, recentPaths));
  }, [query, allFiles, recentPaths]);

  // Show recent files when query is empty
  const displayFiles = useMemo(() => {
    if (query.trim()) return filteredFiles;
    // When no query: show recent files first, then all
    const recent = filteredFiles.filter(f => f.isRecent);
    const rest = filteredFiles.filter(f => !f.isRecent);
    return [...recent, ...rest];
  }, [query, filteredFiles]);

  // Reset state on open
  useLayoutEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [visible]);

  // Clamp selected index
  useEffect(() => {
    if (displayFiles.length === 0) setSelectedIndex(0);
    else setSelectedIndex(i => Math.min(i, displayFiles.length - 1));
  }, [displayFiles.length]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const openFile = useCallback((item: FileItem) => {
    onFileOpen(item.path);
    onClose();
  }, [onFileOpen, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, displayFiles.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const selected = displayFiles[selectedIndex];
        if (selected) openFile(selected);
        break;
      }
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [displayFiles, selectedIndex, openFile, onClose]);

  if (!visible) return null;

  // Split display into recent section and all files section
  const hasQuery = query.trim().length > 0;
  const recentSection = !hasQuery ? displayFiles.filter(f => f.isRecent) : [];
  const filesSection = !hasQuery ? displayFiles.filter(f => !f.isRecent) : displayFiles;
  let globalIndex = -1;

  const renderItem = (item: FileItem) => {
    globalIndex++;
    const idx = globalIndex;
    const isSelected = idx === selectedIndex;
    return (
      <div
        key={item.path}
        data-selected={isSelected || undefined}
        className={`command-item ${isSelected ? 'command-item-selected' : ''}`}
        onClick={() => openFile(item)}
        onMouseEnter={() => setSelectedIndex(idx)}
        role="option"
        aria-selected={isSelected}
      >
        <File size={14} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
        <span className="command-item-label">{item.name}</span>
        <span className="quick-open-path">{item.relativePath}</span>
      </div>
    );
  };

  return (
    <div className="command-palette-overlay" onMouseDown={e => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="command-palette" role="dialog" aria-modal="true" aria-label={isZh ? '快速打开' : 'Quick Open'}>
        <div className="command-palette-search">
          <Search size={16} style={{ padding: '14px 10px 14px 16px', color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="command-palette-input"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isZh ? '输入文件名搜索...' : 'Search files by name...'}
          />
        </div>

        <div className="command-palette-list" ref={listRef}>
          {loading ? (
            <div className="command-palette-empty">
              {isZh ? '加载文件列表...' : 'Loading files...'}
            </div>
          ) : !fileTreeRoot ? (
            <div className="command-palette-empty">
              {isZh ? '请先打开一个文件夹' : 'Open a folder first'}
            </div>
          ) : displayFiles.length === 0 ? (
            <div className="command-palette-empty">
              {isZh ? '未找到匹配文件' : 'No matching files'}
            </div>
          ) : (
            <>
              {recentSection.length > 0 && (
                <div>
                  <div className="command-group-header">
                    <Clock size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                    {isZh ? '最近打开' : 'Recently Opened'}
                  </div>
                  {recentSection.map(renderItem)}
                </div>
              )}
              {filesSection.length > 0 && (
                <div>
                  {recentSection.length > 0 && (
                    <div className="command-group-header">
                      {isZh ? '所有文件' : 'All Files'}
                    </div>
                  )}
                  {filesSection.map(renderItem)}
                </div>
              )}
            </>
          )}
        </div>

        <div className="command-palette-footer">
          <span>↑↓ {isZh ? '导航' : 'navigate'}</span>
          <span>↵ {isZh ? '打开' : 'open'}</span>
          <span>Esc {isZh ? '关闭' : 'close'}</span>
        </div>
      </div>
    </div>
  );
}
