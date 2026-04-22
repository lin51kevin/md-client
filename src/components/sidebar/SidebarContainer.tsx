/**
 * SidebarContainer — 侧边栏统一外壳
 *
 * 将 ActivityBar 对应的各面板（文件树、大纲、搜索、Git）包裹在同一个容器中，
 * 提供右边框拖拽调整宽度的能力，宽度持久化到 localStorage。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { PanelId } from '../editor/ActivityBar';
import './sidebar.css';

const STORAGE_KEY = 'marklite.sidebar-width.v1';
const LEGACY_KEY = 'marklite-sidebar-width'; // 旧key用于迁移
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 160;
const MAX_WIDTH = 480;

function getSavedWidth(): number {
  try {
    // W1: 版本迁移 - 先检查旧key
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const n = Number(legacyRaw);
      if (Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) {
        // 迁移到新key
        localStorage.setItem(STORAGE_KEY, legacyRaw);
        localStorage.removeItem(LEGACY_KEY);
        return n;
      }
      localStorage.removeItem(LEGACY_KEY); // 清理无效数据
    }
    
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDTH;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < MIN_WIDTH || n > MAX_WIDTH) return DEFAULT_WIDTH;
    return n;
  } catch (e) {
    // W2: 记录警告而不是静默忽略
    console.warn('[SidebarContainer] Failed to load saved width:', e);
    return DEFAULT_WIDTH;
  }
}

interface SidebarContainerProps {
  /** 当前激活的面板；null 时容器隐藏 */
  activePanel: PanelId | null;
  children: ReactNode;
}

export function SidebarContainer({ activePanel, children }: SidebarContainerProps) {
  const [width, setWidth] = useState<number>(getSavedWidth);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartW = useRef<number>(0);

  const saveWidth = useCallback((w: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(w));
    } catch (e) {
      console.warn('[SidebarContainer] Failed to persist sidebar width:', e);
      try {
        sessionStorage.setItem(STORAGE_KEY, String(w));
      } catch (sessionError) {
        console.warn('[SidebarContainer] Failed to persist sidebar width in sessionStorage:', sessionError);
      }
    }
    // localStorage 不可用时宽度仍保留在内存中，页面关闭前有效
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartW.current = width;
    setDragging(true);
  }, [width]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      // If no mouse button is pressed (e.g., released outside window), end drag
      if (e.buttons === 0) {
        const final = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartW.current));
        setWidth(final);
        saveWidth(final);
        setDragging(false);
        return;
      }
      const delta = e.clientX - dragStartX.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartW.current + delta));
      setWidth(next);
    };

    const onUp = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current;
      const final = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartW.current + delta));
      setWidth(final);
      saveWidth(final);
      setDragging(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // 拖拽期间全局禁用文字选中
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging, saveWidth]);

  if (!activePanel) return null;

  return (
    <div
      className="shrink-0 h-full relative flex flex-col"
      style={{
        width,
        borderRight: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        // 拖拽期间子内容不捕获鼠标
        pointerEvents: dragging ? 'none' : undefined,
      }}
    >
      {/* 面板内容区 */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ pointerEvents: dragging ? 'none' : undefined }}>
        {children}
      </div>

      {/* 右侧拖拽 handle */}
      <div
        className="sidebar-resize-handle"
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          right: -3,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          zIndex: 10,
        }}
      />
    </div>
  );
}
