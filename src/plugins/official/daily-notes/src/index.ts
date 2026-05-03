import type { PluginContext } from '../../../plugin-sandbox';

// ── Template ────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE = `# \${date} 日记

## 今日计划
-

## 笔记
-

## 总结
-
`;

/** Replace template variables: ${date} ${time} ${datetime} ${filename} */
export function applyTemplate(template: string, dateStr: string): string {
  const now = new Date();
  const time = now.toLocaleTimeString('zh-CN', { hour12: false });
  const datetime = `${dateStr} ${time}`;
  const filename = `${dateStr}.md`;

  return template
    .replace(/\$\{date\}/g, dateStr)
    .replace(/\$\{time\}/g, time)
    .replace(/\$\{datetime\}/g, datetime)
    .replace(/\$\{filename\}/g, filename);
}

/** Get today's date string in YYYY-MM-DD format */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/** Build the relative path for a daily note file */
export function getDailyNotePath(dateStr: string): string {
  return `daily-notes/${dateStr}.md`;
}

// ── Activate ────────────────────────────────────────────────────────────────

export async function activate(context: PluginContext) {
  // Sidebar panel showing recent daily notes
  const panel = context.sidebar.registerPanel('daily-notes-official', {
    title: 'Daily Notes',
    icon: 'calendar',
    render: () => {
      const allFiles = context.workspace.getAllFiles();
      const dailyFiles = allFiles
        .filter((f) => f.startsWith('daily-notes/') && f.endsWith('.md'))
        .sort()
        .reverse();

      if (dailyFiles.length === 0) return '暂无日记\n\n使用 Ctrl+D 创建今日笔记';

      const today = getTodayDate();
      return dailyFiles
        .map((f) => {
          const name = f.replace('daily-notes/', '').replace('.md', '');
          return name === today ? `- **${name}** (今天)` : `- ${name}`;
        })
        .join('\n');
    },
  });

  // Core command: open or create today's daily note
  const openDailyNote = async () => {
    const dateStr = getTodayDate();
    const filePath = getDailyNotePath(dateStr);

    // If file already exists, just open it
    const allFiles = context.workspace.getAllFiles();
    if (allFiles.includes(filePath)) {
      context.workspace.openFile(filePath);
      return;
    }

    // Load user template or fall back to default
    const userTemplate = await context.storage.get('template');
    const template = userTemplate ?? DEFAULT_TEMPLATE;
    const content = applyTemplate(template, dateStr);

    context.workspace.createNewDoc(content);
  };

  // Register the command (Ctrl+D is bound via keybinding config)
  const cmd = context.commands.register('daily-notes.open', openDailyNote, {
    label: '打开今日日记',
    labelEn: 'Open Daily Note',
    category: 'Daily Notes',
  });

  return {
    deactivate: () => {
      cmd.dispose();
      panel.dispose();
    },
  };
}
