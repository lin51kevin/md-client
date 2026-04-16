import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DragOverlay } from '../../components/DragOverlay';

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

describe('DragOverlay', () => {
  it('渲染拖拽提示区域 - 文件模式', () => {
    render(<DragOverlay />);
    expect(screen.getByText('drag.dropToOpen')).toBeTruthy();
  });

  it('显示支持的文件类型', () => {
    render(<DragOverlay />);
    expect(screen.getByText('drag.supportedFormats')).toBeTruthy();
  });

  it('渲染拖拽提示区域 - 文件夹模式', () => {
    render(<DragOverlay dragKind="folder" />);
    expect(screen.getByText('drag.dropToOpenFolder')).toBeTruthy();
  });

  it('文件夹模式不显示文件格式提示', () => {
    render(<DragOverlay dragKind="folder" />);
    expect(screen.queryByText('drag.supportedFormats')).toBeNull();
  });
});
