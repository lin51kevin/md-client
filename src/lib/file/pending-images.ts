/**
 * F014 — 待转存图片注册表
 *
 * 在未保存的标签页中插入图片时，图片先保存到设置目录或系统临时目录。
 * 当文档首次保存（Save As）时，将图片从临时位置复制到文档目录下的
 * assets/images/ 并将 Markdown 中的绝对路径重写为相对路径。
 *
 * 本模块维护一个 Map<tabId, PendingImage[]> 注册表，跟踪每个
 * 未保存标签页中待转存的图片。
 */

export interface PendingImage {
  /** 图片在磁盘上的绝对路径 */
  absolutePath: string;
  /** 图片文件名，如 img-1712973456123.png */
  fileName: string;
  /** 是否保存在系统临时目录（关闭标签时需删除） */
  isTemp: boolean;
}

/** Module-level registry: tabId → pending images */
const registry = new Map<string, PendingImage[]>();

/** 记录一张待转存图片 */
export function addPendingImage(tabId: string, image: PendingImage): void {
  const list = registry.get(tabId) ?? [];
  registry.set(tabId, [...list, image]);
}

/** 获取某标签页的所有待转存图片 */
export function getPendingImages(tabId: string): PendingImage[] {
  return registry.get(tabId) ?? [];
}

/** 清除某标签页的待转存记录 */
export function clearPendingImages(tabId: string): void {
  registry.delete(tabId);
}

/** 判断某标签页是否有待转存图片 */
export function hasPendingImages(tabId: string): boolean {
  const list = registry.get(tabId);
  return list !== undefined && list.length > 0;
}
