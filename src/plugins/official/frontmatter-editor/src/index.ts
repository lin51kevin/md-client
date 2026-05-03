import type { PluginContext } from '../../../plugin-sandbox';

// ── Simple YAML Frontmatter Parser (no dependencies) ──────────────────────

interface YamlValue {
  type: 'string' | 'number' | 'boolean' | 'array' | 'null';
  value: string;
}

type FrontmatterData = Record<string, YamlValue>;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

function detectType(raw: string): YamlValue {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === '~') return { type: 'null', value: '' };
  if (trimmed === 'true' || trimmed === 'yes') return { type: 'boolean', value: 'true' };
  if (trimmed === 'false' || trimmed === 'no') return { type: 'boolean', value: 'false' };
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return { type: 'number', value: trimmed };
  // Array: bracket notation
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return { type: 'array', value: trimmed };
  return { type: 'string', value: raw };
}

function parseFrontmatter(content: string): { data: FrontmatterData; bodyStart: number } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { data: {}, bodyStart: 0 };

  const data: FrontmatterData = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const raw = line.slice(idx + 1).trim();
    // Handle quoted strings
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      data[key] = { type: 'string', value: raw.slice(1, -1) };
    } else {
      data[key] = detectType(raw);
    }
  }

  return { data, bodyStart: match[0].length };
}

function formatValue(entry: YamlValue): string {
  switch (entry.type) {
    case 'null': return 'null';
    case 'boolean': return entry.value;
    case 'number': return entry.value;
    case 'array': return entry.value;
    default: return `"${entry.value}"`;
  }
}

export function serializeFrontmatter(data: FrontmatterData): string {
  const keys = Object.keys(data);
  if (keys.length === 0) return '';

  const lines = keys.map((k) => `${k}: ${formatValue(data[k])}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

// ── Sidebar Panel Renderer ────────────────────────────────────────────────

function renderPanel(data: FrontmatterData, hasFrontmatter: boolean): string {
  if (!hasFrontmatter) {
    return '**暂无 Frontmatter**\n\n在文档顶部添加 `---` 包裹的 YAML 元数据即可在此编辑。';
  }

  const keys = Object.keys(data);
  if (keys.length === 0) {
    return '**Frontmatter 为空**\n\n在 `---` 块中添加键值对。';
  }

  const typeIcons: Record<string, string> = {
    string: '🔤',
    number: '#️⃣',
    boolean: '✅',
    array: '📋',
    null: '∅',
  };

  const rows = keys.map((k) => {
    const v = data[k];
    const icon = typeIcons[v.type] || '🔤';
    const displayVal = v.value.length > 50 ? v.value.slice(0, 47) + '...' : v.value;
    return `**${k}** ${icon}\n\`${displayVal}\``;
  });

  return rows.join('\n\n');
}

// ── Activate ────────────────────────────────────────────────────────────────

export async function activate(context: PluginContext) {
  const panel = context.sidebar.registerPanel('frontmatter-editor', {
    title: 'Frontmatter',
    icon: 'braces',
    render: () => {
      const content = context.editor.getContent();
      const { data, bodyStart } = parseFrontmatter(content);
      const hasFrontmatter = bodyStart > 0;
      return renderPanel(data, hasFrontmatter);
    },
  });

  // Auto-refresh panel when the active file changes
  const fileWatcher = context.workspace.onFileChanged(() => {
    (panel as { refresh?: () => void }).refresh?.();
  });

  return {
    deactivate: () => {
      fileWatcher.dispose();
      panel.dispose();
    },
  };
}
