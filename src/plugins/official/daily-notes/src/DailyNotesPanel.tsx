import type { PluginContext } from '../../../plugin-sandbox';

/**
 * DailyNotesPanel — sidebar component that shows this week's daily notes.
 * Provides quick navigation to recent entries.
 */

function getWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function createDailyNotesPanelContent(context: PluginContext) {
  const refresh = () => {
    const allFiles = context.workspace.getAllFiles();
    const dailyFiles = allFiles.filter(
      (f) => f.startsWith('daily-notes/') && f.endsWith('.md'),
    );

    const weekDates = getWeekDates();
    const todayStr = new Date().toISOString().split('T')[0];

    const weekNotes = weekDates
      .filter((d) => dailyFiles.includes(`daily-notes/${d}.md`))
      .map((d) => {
        const isToday = d === todayStr;
        const label = isToday ? `**${d}** ⭐` : d;
        return `- ${label}`;
      });

    if (weekNotes.length === 0) {
      return '本周暂无日记\n\n使用 Ctrl+D 创建今日笔记';
    }

    return `本周日记\n${weekNotes.join('\n')}`;
  };

  return {
    refresh,
    render: refresh,
  };
}
