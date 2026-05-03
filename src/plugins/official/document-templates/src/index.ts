import type { PluginContext } from '../../../plugin-sandbox';
import { TemplatesPanelContent } from './TemplatesPanel';

const STORAGE_KEY = 'document-templates.user-templates';

export interface Template {
  id: string;
  name: string;
  content: string;
  builtIn?: boolean;
}

// ── Default templates ──────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'meeting-notes',
    name: '📋 会议纪要',
    builtIn: true,
    content: `# 会议纪要

**日期：** \${date} \${time}
**地点：**
**参会人：**

---

## 议题

1.

## 决议

-

## 行动项

| 负责人 | 任务 | 截止日期 |
| ------ | ---- | -------- |
|        |      |          |

---

\${cursor}`,
  },
  {
    id: 'tech-doc',
    name: '🔧 技术文档',
    builtIn: true,
    content: `# \${filename}

## 概述

> 简要描述本文档的目的和范围。

## 背景

## API Reference

### \`GET /api/example\`

**请求参数：**

| 参数   | 类型   | 必填 | 说明 |
| ------ | ------ | ---- | ---- |
| \`id\` | string | 是   |      |

**响应示例：**

\`\`\`json
{
  "code": 0,
  "data": {}
}
\`\`\`

## 示例

\`\`\`
// usage example
\`\`\`

## 注意事项

\${cursor}`,
  },
  {
    id: 'diary',
    name: '📔 日记',
    builtIn: true,
    content: `# \${date} 日记

**天气：**
**心情：**

---

## 今日事项

-

## 感悟

\${cursor}`,
  },
];

// ── Template engine ────────────────────────────────────────────────────────

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => vars[key] ?? `\${${key}}`);
}

export function getTemplateVars(filename: string): Record<string, string> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    filename: filename || 'untitled',
    cursor: '',
  };
}

// ── Storage helpers ────────────────────────────────────────────────────────

export async function loadUserTemplates(storage: PluginContext['storage']): Promise<Template[]> {
  const raw = await storage.get(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Template[];
  } catch {
    return [];
  }
}

export async function saveUserTemplates(storage: PluginContext['storage'], templates: Template[]): Promise<void> {
  await storage.set(STORAGE_KEY, JSON.stringify(templates));
}

export async function getAllTemplates(storage: PluginContext['storage']): Promise<Template[]> {
  const userTemplates = await loadUserTemplates(storage);
  return [...DEFAULT_TEMPLATES, ...userTemplates];
}

export async function createTemplate(
  storage: PluginContext['storage'],
  template: Omit<Template, 'id'>,
): Promise<Template> {
  const templates = await loadUserTemplates(storage);
  const newTemplate: Template = {
    ...template,
    id: `user-${Date.now()}`,
  };
  templates.push(newTemplate);
  await saveUserTemplates(storage, templates);
  return newTemplate;
}

export async function deleteTemplate(
  storage: PluginContext['storage'],
  id: string,
): Promise<void> {
  const templates = await loadUserTemplates(storage);
  await saveUserTemplates(
    storage,
    templates.filter((t) => t.id !== id),
  );
}

export async function updateTemplate(
  storage: PluginContext['storage'],
  id: string,
  patch: Partial<Pick<Template, 'name' | 'content'>>,
): Promise<void> {
  const templates = await loadUserTemplates(storage);
  const idx = templates.findIndex((t) => t.id === id);
  if (idx >= 0) {
    templates[idx] = { ...templates[idx], ...patch };
    await saveUserTemplates(storage, templates);
  }
}

// ── Plugin entry ───────────────────────────────────────────────────────────

export function activate(context: PluginContext) {
  const panelContent = new TemplatesPanelContent(context);

  const panel = context.sidebar.registerPanel('document-templates', {
    title: 'Templates',
    icon: 'file-text',
    render: () => panelContent,
  });

  const cmdDisposable = context.commands.register(
    'templates.new-from-template',
    () => panelContent.handleNewFromTemplate(),
    {
      label: '从模板新建',
      labelEn: 'New from Template',
      category: 'File',
    },
  );

  return {
    deactivate: () => {
      panel.dispose();
      cmdDisposable.dispose();
    },
  };
}
