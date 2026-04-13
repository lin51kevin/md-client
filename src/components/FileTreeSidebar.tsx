/**
 * F014 — 文件树侧边栏
 *
 * 树形展示目录结构，支持懒加载子目录、点击文件打开、切换根目录。
 * 使用 Tauri invoke 调用 Rust 后端 list_directory 命令。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { message, open as openDialog } from '@tauri-apps/plugin-dialog';
import {
  Folder,
  FolderTree,
  RefreshCw,
  ArrowUp,
  Loader2,
  Search,
  X,
  Plus,
} from 'lucide-react';
import { TreeNodeView } from './FileTreeNode';
import { FileTreeContextMenu } from './FileTreeContextMenu';


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
  /** 关闭侧边栏的回调 */
  onClose?: () => void;
}

/** 前端树节点（比后端多一个 expanded 状态） */
export interface TreeNode extends DirEntry {
  expanded: boolean;
  loading?: boolean;
  childrenLoaded: boolean; // 是否已从后端加载过子项
}

function buildTreeNode(entry: DirEntry, expandedSet?: Set<string>): TreeNode {
  return { 
    ...entry, 
    expanded: expandedSet?.has(entry.path) ?? false, 
    childrenLoaded: !!entry.children?.length 
  };
}

/**
 * 递归过滤树节点：返回名称匹配 query 的节点（保留父目录结构）
 */
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return nodes;
  const lower = query.toLowerCase();

  return nodes.reduce<TreeNode[]>((acc, node) => {
    const nameMatch = node.name.toLowerCase().includes(lower);
    const filteredChildren = node.children ? filterTree(node.children as TreeNode[], query) : [];

    if (nameMatch || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
        expanded: filteredChildren.length > 0 || (nameMatch && node.is_dir),
      });
    }
    return acc;
  }, []);
}

/** Module-level helper — runs only when the module is first loaded (not on re-renders) */
function loadSavedExpanded(): Set<string> {
  try {
    const saved = localStorage.getItem('marklite-filetree-expanded');
    if (saved) return new Set(JSON.parse(saved));
  } catch { /* ignore */ }
  return new Set();
}

export function FileTreeSidebar({
  visible = true,
  onFileOpen,
  activeFilePath,
  onClose,
}: FileTreeSidebarProps) {
  const [rootPath, setRootPath] = useState<string>(() => {
    try { return localStorage.getItem('marklite-filetree-root') || ''; }
    catch { return ''; }
  });
  const [rootName, setRootName] = useState<string>(''); // 显示用短名
  const [rootEntries, setRootEntries] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const expandedDirsRef = useRef<Set<string>>(loadSavedExpanded());
  const initializedRef = useRef(false);

  // --- CRUD 状态 ---
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const renamingRef = useRef(false); // 防止 Enter + 双重触发

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
      const nodes: TreeNode[] = entries.map(e => buildTreeNode(e, expandedDirsRef.current));

      // 更新 rootEntries 中对应目录的 children
      setRootEntries(prev =>
        prev.map(node => updateNodeChildren(node, dirPath, nodes))
      );
      expandedDirsRef.current.add(dirPath);
    } catch (e) {
      console.warn(`[FileTreeSidebar] loadChildren failed: ${e}`);
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

  /** 切换展开/折叠（含持久化） */
  const toggleDir = useCallback((path: string) => {
    setRootEntries(prev => {
      const next = prev.map(node => toggleNodeExpand(node, path));
      // Re-walk the new tree to collect currently expanded paths and persist synchronously
      const expanded = new Set<string>();
      function collect(n: TreeNode) {
        if (n.expanded) expanded.add(n.path);
        if (n.children) n.children.forEach(c => collect(c as TreeNode));
      }
      next.forEach(collect);
      expandedDirsRef.current = expanded;
      try { localStorage.setItem('marklite-filetree-expanded', JSON.stringify([...expanded])); } catch { /* ignore */ }
      return next;
    });
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
      setRootEntries(entries.map(e => buildTreeNode(e, expandedDirsRef.current)));
      setRootPath(target);
      setRootName(displayName(target));
      try { localStorage.setItem('marklite-filetree-root', target); } catch { /* ignore */ }
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

  // --- CRUD 处理函数 ---

  /** 新建文件 */
  const handleNewFile = useCallback(async () => {
    const dirPath = rootPath;
    if (!dirPath) return;
    const name = `untitled-${Date.now()}.md`;
    const fullPath = dirPath.replace(/[/\\]*$/, '') + '/' + name;
    try {
      await invoke('create_file', { path: fullPath });
      // 重新加载根目录以显示新文件
      await loadRoot();
      // 打开新文件
      onFileOpen?.(fullPath);
    } catch (e) {
      await message(String(e), { title: '创建文件失败', kind: 'error' });
    }
  }, [rootPath, loadRoot, onFileOpen]);

  /** 删除文件 */
  const handleDelete = useCallback(async (node: TreeNode) => {
    if (node.is_dir) return; // 不删除目录
    try {
      await invoke('delete_file', { path: node.path });
      setContextMenu(null);
      await loadRoot();
    } catch (e) {
      await message(String(e), { title: '删除文件失败', kind: 'error' });
    }
  }, [loadRoot]);

  /** 开始重命名 */
  const handleStartRename = useCallback((node: TreeNode) => {
    // 去掉扩展名用于编辑（保留扩展名）
    const dotIndex = node.name.lastIndexOf('.');
    const baseName = dotIndex > 0 ? node.name.slice(0, dotIndex) : node.name;
    setRenamingPath(node.path);
    setRenameValue(baseName); // 只编辑文件名部分，不包含扩展名
    setContextMenu(null);
  }, []);

  /** 确认重命名 */
  const handleConfirmRename = useCallback(async () => {
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null);
      return;
    }
    // 防止 Enter + onBlur 双重触发
    if (renamingRef.current) return;
    renamingRef.current = true;

    // 找到原始文件的目录和扩展名（兼容 Windows 反斜杠和 Unix 正斜杠）
    const lastSepIdx = Math.max(renamingPath.lastIndexOf('/'), renamingPath.lastIndexOf('\\'));
    const originalName = lastSepIdx >= 0 ? renamingPath.slice(lastSepIdx + 1) : renamingPath;
    const dirPart = lastSepIdx >= 0 ? renamingPath.slice(0, lastSepIdx + 1) : '';
    const dotIndex = originalName.lastIndexOf('.');
    const ext = dotIndex > 0 ? originalName.slice(dotIndex) : '.md';
    const newName = renameValue.trim() + ext;
    const newPath = dirPart + newName;

    if (newPath === renamingPath) {
      setRenamingPath(null);
      renamingRef.current = false;
      return;
    }

    try {
      await invoke('rename_file', { old_path: renamingPath, new_path: newPath });
    } catch (e) {
      await message(String(e), { title: '重命名失败', kind: 'error' });
    } finally {
      setRenamingPath(null);
      setRenameValue('');
      renamingRef.current = false;
      await loadRoot();
    }
  }, [renamingPath, renameValue, loadRoot]);

  /** 右键菜单 */
  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.is_file) {
      setContextMenu({ x: e.clientX, y: e.clientY, node });
    }
  }, []);

  /** 使用 Tauri 对话框选择新根目录 */
  const pickFolder = useCallback(async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) {
        loadRoot(selected as string);
      }
    } catch (e) {
      console.warn(`[FileTreeSidebar] pickFolder failed: ${e}`);
    }
  }, [loadRoot]);

  // 初始化：使用递归读取加载默认根目录（仅首次或 rootPath 为空时执行）
  useEffect(() => {
    // 已初始化过且有保存的 rootPath，不再重新加载
    if (initializedRef.current && rootPath) {
      setLoading(false);
      return;
    }

    async function init() {
      try {
        // 如果有持久化的 rootPath 且不是默认值，直接用它加载
        const savedPath = rootPath || '.';
        const homePath: string | null = await invoke('list_directory', { path: savedPath })
          .then(() => savedPath)
          .catch(() => null);

        if (homePath !== null) {
          const rootEntry: DirEntry = await invoke('read_dir_recursive', { path: savedPath, depth: 2 });
          setRootPath(savedPath);
          setRootName(displayName(savedPath));
          setRootEntries((rootEntry.children || []).map(e => buildTreeNode(e, expandedDirsRef.current)));
          try { localStorage.setItem('marklite-filetree-root', savedPath); } catch { /* ignore */ }
        } else {
          setError('无法访问当前目录');
        }
      } catch (e) {
        // fallback：尝试单层
        try {
          const entries: DirEntry[] = await invoke('list_directory', { path: rootPath || '.' });
          const p = rootPath || '.';
          setRootPath(p);
          setRootName(displayName(p));
          setRootEntries(entries.map(e => buildTreeNode(e, expandedDirsRef.current)));
        } catch (e2) {
          setError(String(e2));
        }
      } finally {
        setLoading(false);
        initializedRef.current = true;
      }
    }
    if (visible) init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 搜索过滤后的文件列表
  const filteredEntries = searchQuery.trim()
    ? filterTree(rootEntries, searchQuery)
    : rootEntries;

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
          className="text-xs font-medium truncate max-w-25"
          style={{ color: 'var(--text-primary)' }}
          title={rootPath}
        >
          {rootName || '文件'}
        </span>

        <span className="ml-auto flex items-center gap-0.5">
          <button
            onClick={handleNewFile}
            title="新建文件"
            className="file-tree-tool-btn"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Plus size={12} />
          </button>
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
          {onClose && (
            <button
              onClick={onClose}
              title="关闭"
              className="file-tree-tool-btn"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          )}
        </span>
      </div>

      {/* 搜索框 */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5"
        style={{
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <Search size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="搜索文件..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 text-xs bg-transparent outline-none"
          style={{
            color: 'var(--text-primary)',
            caretColor: 'var(--accent-color)',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="shrink-0 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={12} />
          </button>
        )}
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
      ) : filteredEntries.length === 0 && searchQuery.trim() ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            无匹配结果
          </p>
        </div>
      ) : rootEntries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            此目录为空<br/>或没有支持的文件类型
          </p>
        </div>
      ) : (
        <nav className="flex-1 py-1 overflow-y-auto" onClick={() => setContextMenu(null)}>
          {filteredEntries.map((node) => (
            <TreeNodeView
              key={node.path}
              node={node}
              activeFilePath={activeFilePath}
              onFileOpen={onFileOpen}
              onToggleDir={toggleDir}
              onLoadChildren={loadChildren}
              onContextMenu={handleContextMenu}
              renamingPath={renamingPath}
              renameValue={renameValue}
              onRenameValueChange={setRenameValue}
              onRenameConfirm={handleConfirmRename}
              onRenameCancel={() => { setRenamingPath(null); setRenameValue(''); }}
            />
          ))}
        </nav>
      )}

      {contextMenu && (
        <FileTreeContextMenu
          menu={contextMenu}
          onRename={handleStartRename}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
