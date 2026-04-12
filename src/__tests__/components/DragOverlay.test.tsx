import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DragOverlay } from '../../components/DragOverlay';

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

describe('DragOverlay', () => {
  it('渲染拖拽提示区域', () => {
    render(<DragOverlay />);
    expect(screen.getByText('drag.dropToOpen')).toBeTruthy();
  });

  it('显示支持的文件类型', () => {
    render(<DragOverlay />);
    expect(screen.getByText(/\.md/)).toBeTruthy();
  });
});
