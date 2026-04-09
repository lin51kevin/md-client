/**
 * F014 — 文件树侧边栏
 *
 * 树形展示目录结构，支持懒加载子目录、点击文件打开、切换根目录。
 * 使用 Tauri invoke 调用 Rust 后端 list_directory 命令。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  FolderTree,
  RefreshCw,
  ArrowUp,
  Loader2,
} from 'lucide-react';


/** Rust 后端返回的目录条目结构 */
export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_file: boolean;
  extension?: string | null;
  children?: DirEntry[] | null;
}

interface FileTreeSidebarProps {
  /** 是否可见 */
  visible?: boolean;
  /** 点击文件的回调 — 打开到新标签页 */
  onFileOpen?: (filePath: string) => void;
  /** 当前选中的文件路径（高亮） */
  activeFilePath?: string | null;
}

/** 前端树节点（比后端多一个 expanded 状态） */
interface TreeNode extends DirEntry {
  expanded: boolean;
  loading?: boolean;
  childrenLoaded: boolean; // 是否已从后端加载过子项
}

function buildTreeNode(entry: DirEntry): TreeNode {
  return { ...entry, expanded: false, childrenLoaded: !!entry.children?.length };
}

/**
 * 递归渲染树节点
 */
function TreeNodeView({
  node,
  depth = 0,
  activeFilePath,
  onFileOpen,
  onToggleDir,
  onLoadChildren,
}: {
  node: TreeNode;
  depth?: number;
  activeFilePath?: string | null;
  onFileOpen?: (path: string) => void;
  onToggleDir: (path: string) => void;
  onLoadChildren: (path: string) => Promise<void>;
}) {
  const isActive = activeFilePath === node.path;

  return (
    <div>
      <div
        className="group flex items-center gap-1 border-l-2 cursor-pointer"
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          borderColor: isActive ? 'var(--accent-color)' : 'transparent',
          backgroundColor: isActive ? 'color-mix(in srgb, var(--accent-color) 12%, transparent)' : undefined,
        }}
      >
        {/* 展开/折叠箭头 */}
        <button
          onClick={(e) => { e.stopPropagation(); if (node.is_dir) onToggleDir(node.path); }}
          className="shrink-0 flex items-center justify-center w-5 h-6"
          style={{
            color: 'var(--text-secondary)',
            cursor: node.is_dir ? 'pointer' : 'default',
            opacity: node.is_dir ? 1 : 0,
          }}
          tabIndex={node.is_dir ? 0 : -1}
        >
          {node.loading ? (
            <Loader2 size={11} strokeWidth={2} className="animate-spin" />
          ) : (
            <ChevronRight
              size={11}
              strokeWidth={2}
              style={{ transition: 'transform 0.15s ease', transform: node.expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          )}
        </button>

        {/* 图标 */}
        <span className="shrink-0" style={{ color: node.is_dir ? (node.expanded ? 'var(--accent-color)' : 'var(--text-secondary)') : 'var(--text-secondary)' }}>
          {node.is_dir
            ? (node.expanded ? <FolderOpen size={14} /> : <Folder size={14} />)
            : <FileText size={13} />
          }
        </span>

        {/* 名称 */}
        <button
          onClick={() => {
            if (node.is_dir) {
              onToggleDir(node.path);
              if (!node.childrenLoaded) { onLoadChildren(node.path); }
            } else {
              onFileOpen?.(node.path);
            }
          }}
          title={node.path}
          className="flex-1 text-left py-1.5 pr-2 text-xs truncate transition-colors file-tree-item"
          style={{ color: isActive ? 'var(--accent-color)' : 'var(--text-primary)' }}
        >
          {node.name}
        </button>
      </div>

      {/* 子节点 */}
      {node.expanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.path}
              node={buildTreeNode(child)}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              onFileOpen={onFileOpen}
              onToggleDir={onToggleDir}
              onLoadChildren={onLoadChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTreeSidebar({
  visible = true,
  onFileOpen,
  activeFilePath,
}: FileTreeSidebarProps) {
  const [rootPath, setRootPath] = useState<string>('');
  const [rootName, setRootName] = useState<string>(''); // 显示用短名
  const [rootEntries, setRootEntries] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const expandedDirsRef = useRef<Set<string>>(new Set());

  /**
   * 从路径提取显示用的目录名
   */
  const displayName = (p: string): string => {
    const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/);
    return parts[parts.length - 1] || p;
  };

  /** 加载指定目录的内容（用于懒加载） */
  const loadChildren = useCallback(async (dirPath: string) => {
    try {
      const entries: DirEntry[] = await invoke('list_directory', { path: dirPath });
      const nodes: TreeNode[] = entries.map(buildTreeNode);

      // 更新 rootEntries 中对应目录的 children
      setRootEntries(prev =>
        prev.map(node => updateNodeChildren(node, dirPath, nodes))
      );
      expandedDirsRef.current.add(dirPath);
    } catch (e) {
      console.error('Failed to load children:', e);
    }
  }, []);

  /** 递归更新树节点的 children */
  function updateNodeChildren(node: TreeNode, targetPath: string, newChildren: TreeNode[]): TreeNode {
    if (node.path === targetPath) {
      return { ...node, children: newChildren, childrenLoaded: true };
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child =>
          updateNodeChildren(child as unknown as TreeNode, targetPath, newChildren)
        ),
      };
    }
    return node;
  }

  /** 切换展开/折叠 */
  const toggleDir = useCallback((path: string) => {
    setRootEntries(prev =>
      prev.map(node => toggleNodeExpand(node, path))
    );
  }, []);

  function toggleNodeExpand(node: TreeNode, targetPath: string): TreeNode {
    if (node.path === targetPath) {
      return { ...node, expanded: !node.expanded };
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child =>
          toggleNodeExpand(child as unknown as TreeNode, targetPath)
        ),
      };
    }
    return node;
  }

  /** 加载根目录 */
  const loadRoot = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);
    const target = path ?? rootPath;
    if (!target) { setLoading(false); return; }
    try {
      const entries: DirEntry[] = await invoke('list_directory', { path: target });
      setRootEntries(entries.map(buildTreeNode));
      setRootPath(target);
      setRootName(displayName(target));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [rootPath]);

  /** 切换到父目录 */
  const goParent = useCallback(() => {
    const parent = rootPath.replace(/[/\\][^/\\]*$/, '') || '/';
    loadRoot(parent);
  }, [rootPath, loadRoot]);

  /** 使用 Tauri 对话框选择新根目录 */
  const pickFolder = useCallback(async () => {
    try {
      // 动态导入避免非 Tauri 环境报错
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        loadRoot(selected as string);
      }
    } catch (e) {
      console.error('pickFolder failed:', e);
    }
  }, [loadRoot]);

  // 初始化：使用递归读取加载默认根目录
  useEffect(() => {
    async function init() {
      try {
        // 尝试获取用户 home 目录
        const homePath: string | null = await invoke('list_directory', { path: '.' })
          .then(() => '.')
          .catch(() => null);

        if (homePath !== null) {
          // 用递归方式初始加载，带 2 层深度
          const rootEntry: DirEntry = await invoke('read_dir_recursive', { path: '.', depth: 2 });
          setRootPath('.');
          setRootName(displayName('.'));
          setRootEntries((rootEntry.children || []).map(buildTreeNode));
        } else {
          setError('无法访问当前目录');
        }
      } catch (e) {
        // fallback：尝试单层
        try {
          const entries: DirEntry[] = await invoke('list_directory', { path: '.' });
          setRootPath('.');
          setRootName(displayName('.'));
          setRootEntries(entries.map(buildTreeNode));
        } catch (e2) {
          setError(String(e2));
        }
      } finally {
        setLoading(false);
      }
    }
    if (visible) init();
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="w-60 shrink-0 h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* 头部：工具栏 */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-3 py-2"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <FolderTree size={14} style={{ color: 'var(--text-secondary)' }} />
        <span
          className="text-xs font-medium truncate max-w-[100px]"
          style={{ color: 'var(--text-primary)' }}
          title={rootPath}
        >
          {rootName || '文件'}
        </span>

        <span className="ml-auto flex items-center gap-0.5">
          <button
            onClick={goParent}
            title="上级目录"
            className="file-tree-tool-btn"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowUp size={12} />
          </button>
          <button
            onClick={pickFolder}
            title="选择文件夹"
            className="file-tree-tool-btn"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Folder size={12} />
          </button>
          <button
            onClick={() => loadRoot()}
            title="刷新"
            className="file-tree-tool-btn"
            style={{ color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={12} />
          </button>
        </span>
      </div>

      {/* 内容区 */}
      {error ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-center" style={{ color: 'var(--danger-color, #ef4444)' }}>
            {error}
          </p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : rootEntries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            此目录为空<br/>或没有支持的文件类型
          </p>
        </div>
      ) : (
        <nav className="flex-1 py-1 overflow-y-auto file-tree-nav">
          {rootEntries.map((node) => (
            <TreeNodeView
              key={node.path}
              node={node}
              activeFilePath={activeFilePath}
              onFileOpen={onFileOpen}
              onToggleDir={toggleDir}
              onLoadChildren={loadChildren}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
