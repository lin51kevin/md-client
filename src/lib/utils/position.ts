/**
 * 位置工具函数
 * 确保坐标不超出可视窗口范围
 */
export function clampPosition(x: number, y: number, width: number, height: number): { x: number; y: number } {
  return {
    x: Math.min(x, window.innerWidth - width - 4),
    y: Math.min(y, window.innerHeight - height - 4),
  };
}
