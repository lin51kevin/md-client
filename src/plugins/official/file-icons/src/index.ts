/**
 * marklite-file-icons — 增强的文件树图标映射
 *
 * 根据文件扩展名返回对应的 lucide-react 图标和语言主题色。
 * FileTreeNode 通过 import 此模块来替换内置的简单映射。
 */
import {
  FileText,
  FileCode2,
  File,
  Braces,
  Palette,
  Image,
  Archive,
  Terminal,
  Database,
  Coffee,
  FileCog,
  Settings,
  FileLock,
  Globe,
  Code2,
  GitBranch,
  FileSpreadsheet,
  Table2,
  FileAudio,
  FileVideo,
  FilePen,
  Package,
  Gem,
  TestTube,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';

interface FileIconEntry {
  Icon: LucideIcon;
  color: string;
}

type ExtensionMap = Record<string, FileIconEntry>;

const EXT_MAP: ExtensionMap = {
  // Markdown
  '.md': { Icon: FileText, color: '#519aba' },
  '.mdx': { Icon: FileText, color: '#519aba' },
  '.markdown': { Icon: FileText, color: '#519aba' },
  '.txt': { Icon: FileText, color: '#888888' },
  '.rst': { Icon: FileText, color: '#7da2c9' },

  // JavaScript / TypeScript
  '.js': { Icon: FileCode2, color: '#f1e05a' },
  '.jsx': { Icon: FileCode2, color: '#61dafb' },
  '.mjs': { Icon: FileCode2, color: '#f1e05a' },
  '.cjs': { Icon: FileCode2, color: '#f1e05a' },
  '.ts': { Icon: FileCode2, color: '#3178c6' },
  '.tsx': { Icon: FileCode2, color: '#3178c6' },
  '.d.ts': { Icon: FileCode2, color: '#3178c6' },

  // Web
  '.html': { Icon: Globe, color: '#e34c26' },
  '.htm': { Icon: Globe, color: '#e34c26' },
  '.css': { Icon: Palette, color: '#563d7c' },
  '.scss': { Icon: Palette, color: '#c6538c' },
  '.sass': { Icon: Palette, color: '#a53b70' },
  '.less': { Icon: Palette, color: '#1d365d' },
  '.svg': { Icon: Image, color: '#f7931e' },
  '.vue': { Icon: FileCode2, color: '#42b883' },
  '.svelte': { Icon: FileCode2, color: '#ff3e00' },

  // Data / Config
  '.json': { Icon: Braces, color: '#cbcb41' },
  '.json5': { Icon: Braces, color: '#cbcb41' },
  '.jsonc': { Icon: Braces, color: '#cbcb41' },
  '.yaml': { Icon: Braces, color: '#cb171e' },
  '.yml': { Icon: Braces, color: '#cb171e' },
  '.toml': { Icon: Braces, color: '#9c4221' },
  '.xml': { Icon: Braces, color: '#e44d26' },
  '.csv': { Icon: FileSpreadsheet, color: '#89e051' },
  '.tsv': { Icon: FileSpreadsheet, color: '#89e051' },

  // Shell / scripting
  '.sh': { Icon: Terminal, color: '#89e051' },
  '.bash': { Icon: Terminal, color: '#89e051' },
  '.zsh': { Icon: Terminal, color: '#89e051' },
  '.fish': { Icon: Terminal, color: '#4aae47' },
  '.ps1': { Icon: Terminal, color: '#012456' },
  '.bat': { Icon: Terminal, color: '#c1f12e' },
  '.cmd': { Icon: Terminal, color: '#c1f12e' },
  '.py': { Icon: Code2, color: '#3572a5' },
  '.rb': { Icon: Gem, color: '#701516' },
  '.lua': { Icon: Code2, color: '#000080' },
  '.r': { Icon: Code2, color: '#198ce7' },
  '.pl': { Icon: Code2, color: '#0298c3' },
  '.php': { Icon: FileCode2, color: '#4f5d95' },
  '.rs': { Icon: FileCog, color: '#dea584' },
  '.go': { Icon: FileCode2, color: '#00add8' },
  '.java': { Icon: Coffee, color: '#b07219' },
  '.kt': { Icon: FileCode2, color: '#a97bff' },
  '.swift': { Icon: FileCode2, color: '#f05138' },
  '.c': { Icon: FileCode2, color: '#555555' },
  '.cpp': { Icon: FileCode2, color: '#f34b7d' },
  '.cc': { Icon: FileCode2, color: '#f34b7d' },
  '.h': { Icon: FileCode2, color: '#555555' },
  '.hpp': { Icon: FileCode2, color: '#f34b7d' },
  '.cs': { Icon: FileCode2, color: '#178600' },
  '.scala': { Icon: FileCode2, color: '#c22d40' },
  '.zig': { Icon: FileCode2, color: '#ec915c' },

  // Config / Docker
  '.dockerfile': { Icon: FileCog, color: '#384d54' },
  '.env': { Icon: Settings, color: '#ecd53f' },
  '.prettierrc': { Icon: Settings, color: '#c596c7' },
  '.eslintrc': { Icon: BadgeCheck, color: '#4b32c3' },

  // Database
  '.sql': { Icon: Database, color: '#e38c00' },
  '.db': { Icon: Database, color: '#e38c00' },
  '.sqlite': { Icon: Database, color: '#e38c00' },

  // Lockfiles
  '.lock': { Icon: FileLock, color: '#6b7280' },

  // Images
  '.png': { Icon: Image, color: '#a074c4' },
  '.jpg': { Icon: Image, color: '#a074c4' },
  '.jpeg': { Icon: Image, color: '#a074c4' },
  '.gif': { Icon: Image, color: '#a074c4' },
  '.webp': { Icon: Image, color: '#a074c4' },
  '.ico': { Icon: Image, color: '#a074c4' },
  '.bmp': { Icon: Image, color: '#a074c4' },

  // Audio / Video
  '.mp3': { Icon: FileAudio, color: '#e44d26' },
  '.wav': { Icon: FileAudio, color: '#e44d26' },
  '.ogg': { Icon: FileAudio, color: '#e44d26' },
  '.flac': { Icon: FileAudio, color: '#e44d26' },
  '.mp4': { Icon: FileVideo, color: '#a074c4' },
  '.avi': { Icon: FileVideo, color: '#a074c4' },
  '.mkv': { Icon: FileVideo, color: '#a074c4' },
  '.mov': { Icon: FileVideo, color: '#a074c4' },
  '.webm': { Icon: FileVideo, color: '#a074c4' },

  // Documents
  '.pdf': { Icon: FileText, color: '#ec2025' },
  '.doc': { Icon: FilePen, color: '#185abd' },
  '.docx': { Icon: FilePen, color: '#185abd' },
  '.xls': { Icon: Table2, color: '#217346' },
  '.xlsx': { Icon: Table2, color: '#217346' },
  '.ppt': { Icon: FilePen, color: '#d04423' },
  '.pptx': { Icon: FilePen, color: '#d04423' },

  // Archives
  '.zip': { Icon: Archive, color: '#f9a825' },
  '.tar': { Icon: Archive, color: '#f9a825' },
  '.gz': { Icon: Archive, color: '#f9a825' },
  '.7z': { Icon: Archive, color: '#f9a825' },
  '.rar': { Icon: Archive, color: '#f9a825' },

  // Package manifests
  'package.json': { Icon: Package, color: '#cb3837' },
  'package-lock.json': { Icon: FileLock, color: '#cb3837' },
  'tsconfig.json': { Icon: Settings, color: '#3178c6' },
  'cargo.toml': { Icon: Package, color: '#dea584' },
  'go.mod': { Icon: Package, color: '#00add8' },
  'go.sum': { Icon: FileLock, color: '#00add8' },
  'requirements.txt': { Icon: Package, color: '#3572a5' },
  'gemfile': { Icon: Gem, color: '#701516' },
  'makefile': { Icon: Terminal, color: '#6d8086' },
  'dockerfile': { Icon: FileCog, color: '#384d54' },
  'docker-compose.yml': { Icon: FileCog, color: '#384d54' },
  'docker-compose.yaml': { Icon: FileCog, color: '#384d54' },
  'vite.config.js': { Icon: FileCog, color: '#646cff' },
  'webpack.config.js': { Icon: FileCog, color: '#8dd6f9' },
  '.gitignore': { Icon: GitBranch, color: '#f05032' },
  // Test files
  '.test.js': { Icon: TestTube, color: '#99425b' },
  '.test.ts': { Icon: TestTube, color: '#99425b' },
  '.spec.js': { Icon: TestTube, color: '#99425b' },
  '.spec.ts': { Icon: TestTube, color: '#99425b' },
};

/** Fallback icon for unknown file types. */
const FALLBACK: FileIconEntry = { Icon: File, color: '#6b7280' };

/**
 * 根据文件名返回图标和颜色。
 * 优先按完整文件名匹配（如 package.json），其次按扩展名匹配。
 */
export function getFileIcon(filename: string): FileIconEntry {
  const lower = filename.toLowerCase();

  // Exact name match (e.g. "Makefile", "Dockerfile")
  const nameKey = lower;
  if (EXT_MAP[nameKey]) return EXT_MAP[nameKey];

  // Filename match (e.g. "package.json", ".gitignore")
  if (EXT_MAP[lower]) return EXT_MAP[lower];

  // Extension match (e.g. ".ts", ".py")
  const ext = lower.includes('.') ? '.' + lower.split('.').pop()! : '';
  if (ext && EXT_MAP[ext]) return EXT_MAP[ext];

  return FALLBACK;
}

// ─── Plugin lifecycle ───

export async function activate() {
  // This plugin is a pure utility module consumed by FileTreeNode.
  // No side effects needed; the icon resolver is imported directly.
  return { deactivate: () => {} };
}
