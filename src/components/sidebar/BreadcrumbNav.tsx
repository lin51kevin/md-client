/**
 * Breadcrumb Navigation
 *
 * Shows the active file's path as clickable breadcrumb segments.
 * Clicking a folder segment reveals it in the file tree.
 */
import { useMemo, useCallback } from 'react';
import { ChevronRight, FileText, FolderOpen, Code2 } from 'lucide-react';
import type { BreadcrumbItem } from '../../lib/cm/cmSymbolBreadcrumb';

interface BreadcrumbNavProps {
  filePath: string | null;
  fileTreeRoot: string;
  onNavigateFolder?: (folderPath: string) => void;
  locale: string;
  symbolBreadcrumbs?: BreadcrumbItem[] | null;
}

interface Crumb {
  label: string;
  path: string;
  isFile: boolean;
}

function buildCrumbs(filePath: string, rootPath: string): Crumb[] {
  // Normalize to forward slashes
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const normFile = norm(filePath);
  const normRoot = norm(rootPath);

  // Get relative path from root
  let rel = normFile;
  if (normRoot && normFile.startsWith(normRoot)) {
    rel = normFile.slice(normRoot.length).replace(/^\/+/, '');
  }

  const parts = rel.split('/').filter(Boolean);
  if (parts.length === 0) return [];

  const crumbs: Crumb[] = [];

  // Add root folder crumb
  if (normRoot) {
    const rootName = normRoot.split('/').pop() || normRoot;
    crumbs.push({ label: rootName, path: normRoot, isFile: false });
  }

  // Add intermediate folder crumbs
  for (let i = 0; i < parts.length - 1; i++) {
    const folderPath = normRoot
      ? normRoot + '/' + parts.slice(0, i + 1).join('/')
      : parts.slice(0, i + 1).join('/');
    crumbs.push({ label: parts[i], path: folderPath, isFile: false });
  }

  // Add file crumb
  crumbs.push({ label: parts[parts.length - 1], path: normFile, isFile: true });

  return crumbs;
}

export function BreadcrumbNav({ filePath, fileTreeRoot, onNavigateFolder, locale, symbolBreadcrumbs }: BreadcrumbNavProps) {
  const isZh = locale === 'zh-CN';

  const crumbs = useMemo(() => {
    if (!filePath) return [];
    return buildCrumbs(filePath, fileTreeRoot);
  }, [filePath, fileTreeRoot]);

  const handleClick = useCallback((crumb: Crumb) => {
    if (!crumb.isFile && onNavigateFolder) {
      onNavigateFolder(crumb.path);
    }
  }, [onNavigateFolder]);

  // Use symbol breadcrumbs for code files when available
  if (symbolBreadcrumbs && symbolBreadcrumbs.length > 0) {
    return (
      <nav className="breadcrumb-nav" aria-label="Symbol Breadcrumb">
        {symbolBreadcrumbs.map((item, i) => (
          <span key={`${item.type}-${item.name}-${i}`} className="breadcrumb-segment">
            {i > 0 && <ChevronRight size={12} className="breadcrumb-separator" />}
            <span className="breadcrumb-current">
              {item.type === 'file' ? <FileText size={12} className="breadcrumb-icon" /> : <Code2 size={12} className="breadcrumb-icon" />}
              {item.name}
            </span>
          </span>
        ))}
      </nav>
    );
  }

  if (crumbs.length === 0) {
    return (
      <div className="breadcrumb-nav">
        <span className="breadcrumb-empty">{isZh ? '未保存文件' : 'Unsaved file'}</span>
      </div>
    );
  }

  return (
    <nav className="breadcrumb-nav" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="breadcrumb-segment">
          {i > 0 && <ChevronRight size={12} className="breadcrumb-separator" />}
          {crumb.isFile ? (
            <span className="breadcrumb-current">
              <FileText size={12} className="breadcrumb-icon" />
              {crumb.label}
            </span>
          ) : (
            <button
              className="breadcrumb-link"
              onClick={() => handleClick(crumb)}
              title={crumb.path}
            >
              <FolderOpen size={12} className="breadcrumb-icon" />
              {crumb.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
