import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableEditor } from '../../components/TableEditor';
import type { TableData } from '../../lib/table-parser';

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

const mockTable: TableData = {
  headers: [['Name', 'Age']],
  rows: [['Alice', '30'], ['Bob', '25']],
  alignment: ['left', 'left'],
  startLine: 0,
  endLine: 3,
  raw: '| Name | Age |\n|---|---|\n| Alice | 30 |\n| Bob | 25 |',
};

describe('TableEditor', () => {
  it('渲染表头和数据行', () => {
    render(<TableEditor table={mockTable} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const inputs = screen.getAllByRole('textbox');
    // 2 header cells + 4 data cells = 6
    expect(inputs.length).toBe(6);
  });

  it('Escape 键触发取消', () => {
    const onCancel = vi.fn();
    render(<TableEditor table={mockTable} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('确认按钮触发 onConfirm', () => {
    const onConfirm = vi.fn();
    render(<TableEditor table={mockTable} onConfirm={onConfirm} onCancel={vi.fn()} />);
    const confirmBtn = screen.getByText('common.confirm');
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('可编辑单元格内容', () => {
    render(<TableEditor table={mockTable} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Full Name' } });
    expect((inputs[0] as HTMLInputElement).value).toBe('Full Name');
  });

  it('添加行按钮增加一行', () => {
    render(<TableEditor table={mockTable} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const addRowBtn = screen.getByTitle('table.addRow');
    const initialInputs = screen.getAllByRole('textbox').length;
    fireEvent.click(addRowBtn);
    const afterInputs = screen.getAllByRole('textbox').length;
    expect(afterInputs).toBe(initialInputs + 2); // +2 columns
  });
});
