import type { Tab } from '../../types';

/**
 * 检查是否为 pristine（初始空白）标签页状态
 */
export function isPristineTab(tabs: Tab[]): boolean {
  return tabs.length === 1 && !tabs[0].filePath && !tabs[0].isDirty && !tabs[0].displayName;
}
