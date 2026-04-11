import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useTableEditor } from '../../hooks/useTableEditor';
import type { TableData } from '../../lib/table-parser';

const mockTableData: TableData = {
  rawStart: 0,
  rawEnd: 20,
  headers: [['Name'], ['Age']],
  rows: [['Alice', '30']],
  alignments: ['left', 'right'],
};

describe('useTableEditor', () => {
  it('starts with editingTable as null', () => {
    const cmViewRef = { current: null };
    const updateActiveDoc = vi.fn();
    const { result } = renderHook(() =>
      useTableEditor({ cmViewRef, updateActiveDoc }),
    );
    expect(result.current.editingTable).toBeNull();
  });

  it('setEditingTable updates the state', () => {
    const cmViewRef = { current: null };
    const updateActiveDoc = vi.fn();
    const { result } = renderHook(() =>
      useTableEditor({ cmViewRef, updateActiveDoc }),
    );

    act(() => {
      result.current.setEditingTable(mockTableData);
    });
    expect(result.current.editingTable).toEqual(mockTableData);
  });

  it('handleTableConfirm returns early when editingTable is null', () => {
    const dispatch = vi.fn();
    const cmViewRef = { current: { state: { doc: { toString: () => '' } }, dispatch } as any };
    const updateActiveDoc = vi.fn();
    const { result } = renderHook(() =>
      useTableEditor({ cmViewRef, updateActiveDoc }),
    );

    act(() => { result.current.handleTableConfirm('| A |'); });

    expect(dispatch).not.toHaveBeenCalled();
    expect(updateActiveDoc).not.toHaveBeenCalled();
  });

  it('handleTableConfirm returns early when cmViewRef.current is null', () => {
    const cmViewRef = { current: null };
    const updateActiveDoc = vi.fn();
    const { result } = renderHook(() =>
      useTableEditor({ cmViewRef, updateActiveDoc }),
    );

    act(() => { result.current.setEditingTable(mockTableData); });
    act(() => { result.current.handleTableConfirm('| A |'); });

    expect(updateActiveDoc).not.toHaveBeenCalled();
  });

  it('handleTableConfirm dispatches change and clears editingTable', () => {
    const dispatch = vi.fn();
    const docText = '| Name | Age |\n| Alice | 30 |';
    const cmViewRef = {
      current: {
        state: { doc: { toString: () => docText } },
        dispatch,
      } as any,
    };
    const updateActiveDoc = vi.fn();
    const { result } = renderHook(() =>
      useTableEditor({ cmViewRef, updateActiveDoc }),
    );

    act(() => { result.current.setEditingTable(mockTableData); });
    act(() => { result.current.handleTableConfirm('| New |'); });

    expect(dispatch).toHaveBeenCalledOnce();
    expect(updateActiveDoc).toHaveBeenCalledOnce();
    expect(result.current.editingTable).toBeNull();
  });
});
