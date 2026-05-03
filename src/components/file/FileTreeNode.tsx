/**
 * FileTreeNode — 递归渲染文件树节点
 *
 * 从 FileTreeSidebar 提取，保持单一职责。
 */
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { getFileIcon } from '../../plugins/official/file-icons/src/index';
import type { TreeNode } from './FileTreeSidebar';

interface TreeNodeViewProps {
  node: TreeNode;
  depth?: number;
  activeFilePath?: string | null;
  onFileOpen?: (path: string) => void;
  onToggleDir: (path: string) => void;
  onLoadChildren: (path: string) => Promise<void>;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  renamingPath: string | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
}

export function TreeNodeView({
  node,
  depth = 0,
  activeFilePath,
  onFileOpen,
  onToggleDir,
  onLoadChildren,
  onContextMenu,
  renamingPath,
  renameValue,
  onRenameValueChange,
  onRenameConfirm,
  onRenameCancel,
}: TreeNodeViewProps) {
  const isActive = activeFilePath === node.path;
  const isRenaming = renamingPath === node.path;

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
          onClick={(e) => {
            e.stopPropagation();
            if (node.is_dir) {
              onToggleDir(node.path);
              if (!node.childrenLoaded) { onLoadChildren(node.path); }
            }
          }}
          className="shrink-0 flex items-center justify-center w-5 h-6"
          style={{
            color: 'var(--text-secondary)',
            cursor: node.is_dir ? 'pointer' : 'default',
            opacity: node.is_dir ? 1 : 0,
          }}
          tabIndex={node.is_dir ? 0 : -1}
        >
          {node.loading ? (
            <Loader2 size={11} strokeWidth={2} className="animate-spin" style={{ flexShrink: 0 }} />
          ) : (
            <ChevronRight
              size={11}
              strokeWidth={2}
              style={{ transition: 'transform 0.15s ease', transform: node.expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
            />
          )}
        </button>

        {/* 图标 */}
        <span
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 16,
            height: 16,
            minWidth: 16,
            color: node.is_dir ? (node.expanded ? 'var(--accent-color)' : 'var(--text-secondary)') : 'var(--text-secondary)',
          }}
        >
          {node.is_dir
            ? (node.expanded ? <FolderOpen size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} /> : <Folder size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />)
            : (() => { const { Icon, color } = getFileIcon(node.name); return <Icon size={14} strokeWidth={1.8} style={{ flexShrink: 0, color }} />; })()
          }
        </span>

        {/* 名称 / 重命名输入 */}
        {isRenaming ? (
          <input
            autoFocus
            className="flex-1 text-xs bg-transparent outline-none border px-0.5"
            style={{ color: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onRenameConfirm();
              }
              if (e.key === 'Escape') onRenameCancel();
            }}
            onClick={(e) => e.stopPropagation()}
            onBlur={onRenameConfirm}
          />
        ) : (
          <button
            onClick={() => {
              if (node.is_dir) {
                onToggleDir(node.path);
                if (!node.childrenLoaded) { onLoadChildren(node.path); }
              } else {
                onFileOpen?.(node.path);
              }
            }}
            onContextMenu={(e) => onContextMenu(e, node)}
            title={node.path}
            className="flex-1 text-left py-1.5 pr-2 text-xs truncate transition-colors file-tree-item"
            style={{ color: isActive ? 'var(--accent-color)' : 'var(--text-primary)' }}
          >
            {node.name}
          </button>
        )}
      </div>

      {/* 子节点 */}
      {node.expanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeView
              key={(child as TreeNode).path}
              node={child as TreeNode}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              onFileOpen={onFileOpen}
              onToggleDir={onToggleDir}
              onLoadChildren={onLoadChildren}
              onContextMenu={onContextMenu}
              renamingPath={renamingPath}
              renameValue={renameValue}
              onRenameValueChange={onRenameValueChange}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
