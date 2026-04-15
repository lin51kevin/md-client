/**
 * FileTreeContextMenu — 文件树右键菜单
 *
 * 从 FileTreeSidebar 提取，独立的上下文菜单组件。
 */
import { useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { TreeNode } from './FileTreeSidebar';

interface FileTreeContextMenuProps {
  menu: { x: number; y: number; node: TreeNode };
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onReveal?: (node: TreeNode) => void;
  onClose: () => void;
}

export function FileTreeContextMenu({ menu, onRename, onDelete, onReveal, onClose }: FileTreeContextMenuProps) {
  useEffect(() => {
    const closeMenu = () => onClose();
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 rounded shadow-lg py-1 min-w-30"
      style={{
        left: menu.x,
        top: menu.y,
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors hover:bg-opacity-10"
        style={{ color: 'var(--text-primary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 15%, transparent)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => onRename(menu.node)}
      >
        <Pencil size={12} /> 重命名
      </button>
      {onReveal && !menu.node.isDirectory && (
        <button
          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors hover:bg-opacity-10"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 15%, transparent)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={() => onReveal(menu.node)}
        >
          📂 在文件管理器中显示
        </button>
      )}
      <button
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors hover:bg-opacity-10"
        style={{ color: 'var(--danger-color, #ef4444)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, #ef4444 12%, transparent)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => onDelete(menu.node)}
      >
        <Trash2 size={12} /> 删除
      </button>
    </div>
  );
}
