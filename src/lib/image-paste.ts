/**
 * F014 — 图片粘贴与拖拽插入
 *
 * 核心功能：
 * - 粘贴板图片（PNG/JPG/WEBP/GIF）保存到本地目录
 * - 拖拽图片文件到编辑器自动保存并插入 Markdown
 * - 生成相对路径引用，适配 Markdown 文件的相对路径规范
 */

const IMAGE_DIR_KEY = 'md-client-image-dir';

/**
 * 从 localStorage 读取图片保存目录（默认空 = 保存到被编辑文件同级目录）
 */
export function getImageSaveDir(): string {
  try {
    return localStorage.getItem(IMAGE_DIR_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * 设置图片保存目录
 * @param dir 空字符串表示"跟随当前 Markdown 文件路径"
 */
export function setImageSaveDir(dir: string): void {
  try {
    localStorage.setItem(IMAGE_DIR_KEY, dir);
  } catch { /* ignore */ }
}

/**
 * 生成带时间戳的唯一图片文件名
 */
export function generateImageFileName(ext: string): string {
  const timestamp = Date.now();
  return `img-${timestamp}.${ext}`;
}

/**
 * 将图片路径转换为 Markdown 引用路径
 *
 * @param imageSaveDir  图片保存目录（来自设置或当前 md 文件所在目录）
 * @param fileName     图片文件名
 * @param docPath      当前 Markdown 文件路径（用于计算相对路径）
 * @returns Markdown 图片语法中的路径部分，如 `../images/test.png` 或 `/images/test.png`
 */
export function buildImageMarkdownPath(
  imageSaveDir: string,
  fileName: string,
  docPath?: string,
): string {
  // 如果有 docPath，则计算相对于 doc 目录的路径
  if (docPath) {
    // 从 docPath 提取目录部分（支持 / 和 \），去除尾随分隔符
    const docDirSep = Math.max(docPath.lastIndexOf('/'), docPath.lastIndexOf('\\'));
    const docDir = docPath.substring(0, docDirSep); // 不含分隔符

    // 图片保存目录与文档目录相同 → 直接用文件名
    if (imageSaveDir === docDir || imageSaveDir === '') {
      return fileName;
    }

    // 计算相对路径
    return computeRelativePath(docDir, imageSaveDir + '/' + fileName) ?? fileName;
  }

  // 无 docPath → 返回绝对路径
  return imageSaveDir ? `${imageSaveDir}/${fileName}` : fileName;
}

/**
 * 计算 from → to 的相对路径
 * 简化实现：仅处理同一父目录下的直接相对路径
 */
function computeRelativePath(fromDir: string, toPath: string): string | null {
  // 路径标准化
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const from = norm(fromDir);
  const to = norm(toPath);

  // 统计 from 的目录层级
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);

  if (toParts.length < fromParts.length) return null;

  // 检查前缀是否相同
  let i = 0;
  while (i < fromParts.length && fromParts[i] === toParts[i]) i++;

  const ups = fromParts.length - i;
  const downs = toParts.slice(i);

  const parts = [...Array(ups).fill('..'), ...downs];
  return parts.join('/');
}
