import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { EditableBlock } from '../../components/EditablePreview/EditableBlock';

const MockRender: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <p data-testid="mock-render">{children}</p>
);

describe('EditableBlock', () => {
  it('renders as non-editable block by default', () => {
    const onApplyEdit = vi.fn();
    render(
      <EditableBlock
        nodeType="p"
        sourceText="Hello world"
        startOffset={0}
        endOffset={11}
        defaultRender={MockRender}
        onApplyEdit={onApplyEdit}
      >
        Hello world
      </EditableBlock>,
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByTestId('editable-block-confirm')).not.toBeInTheDocument();
  });

  it('enters edit mode on double-click', () => {
    const onApplyEdit = vi.fn();
    render(
      <EditableBlock
        nodeType="p"
        sourceText="Hello world"
        startOffset={0}
        endOffset={11}
        defaultRender={MockRender}
        onApplyEdit={onApplyEdit}
      >
        Hello world
      </EditableBlock>,
    );
    act(() => {
      fireEvent.doubleClick(screen.getByText('Hello world'));
    });
    expect(screen.getByTestId('editable-block-confirm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument();
  });

  it('applies edit on confirm button click', () => {
    const onApplyEdit = vi.fn();
    render(
      <EditableBlock
        nodeType="p"
        sourceText="Hello world"
        startOffset={0}
        endOffset={11}
        defaultRender={MockRender}
        onApplyEdit={onApplyEdit}
      >
        Hello world
      </EditableBlock>,
    );
    act(() => {
      fireEvent.doubleClick(screen.getByText('Hello world'));
    });
    const textarea = screen.getByDisplayValue('Hello world');
    fireEvent.change(textarea, { target: { value: 'New text' } });
    act(() => {
      fireEvent.click(screen.getByTestId('editable-block-confirm'));
    });
    expect(onApplyEdit).toHaveBeenCalledWith(0, 11, 'New text');
  });

  it('applies edit on Ctrl+Enter', () => {
    const onApplyEdit = vi.fn();
    render(
      <EditableBlock
        nodeType="p"
        sourceText="Hello world"
        startOffset={5}
        endOffset={16}
        defaultRender={MockRender}
        onApplyEdit={onApplyEdit}
      >
        Hello world
      </EditableBlock>,
    );
    act(() => {
      fireEvent.doubleClick(screen.getByText('Hello world'));
    });
    const textarea = screen.getByDisplayValue('Hello world');
    fireEvent.change(textarea, { target: { value: 'Updated' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onApplyEdit).toHaveBeenCalledWith(5, 16, 'Updated');
  });

  it('cancels edit on Escape', () => {
    const onApplyEdit = vi.fn();
    render(
      <EditableBlock
        nodeType="p"
        sourceText="Hello world"
        startOffset={0}
        endOffset={11}
        defaultRender={MockRender}
        onApplyEdit={onApplyEdit}
      >
        Hello world
      </EditableBlock>,
    );
    act(() => {
      fireEvent.doubleClick(screen.getByText('Hello world'));
    });
    const textarea = screen.getByDisplayValue('Hello world');
    fireEvent.change(textarea, { target: { value: 'Changed' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onApplyEdit).not.toHaveBeenCalled();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('cancels edit on cancel button click', () => {
    const onApplyEdit = vi.fn();
    render(
      <EditableBlock
        nodeType="p"
        sourceText="Hello world"
        startOffset={0}
        endOffset={11}
        defaultRender={MockRender}
        onApplyEdit={onApplyEdit}
      >
        Hello world
      </EditableBlock>,
    );
    act(() => {
      fireEvent.doubleClick(screen.getByText('Hello world'));
    });
    fireEvent.change(screen.getByDisplayValue('Hello world'), { target: { value: 'Changed' } });
    act(() => {
      fireEvent.click(screen.getByTestId('editable-block-cancel'));
    });
    expect(onApplyEdit).not.toHaveBeenCalled();
  });

  it('does not call onApplyEdit when content unchanged', () => {
    const onApplyEdit = vi.fn();
    render(
      <EditableBlock
        nodeType="blockquote"
        sourceText="Original"
        startOffset={0}
        endOffset={8}
        defaultRender={MockRender}
        onApplyEdit={onApplyEdit}
      >
        Original
      </EditableBlock>,
    );
    act(() => {
      fireEvent.doubleClick(screen.getByText('Original'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('editable-block-confirm'));
    });
    expect(onApplyEdit).not.toHaveBeenCalled();
  });

  it('shows blue border when editing', () => {
    render(
      <EditableBlock
        nodeType="li"
        sourceText="List item"
        startOffset={0}
        endOffset={9}
        defaultRender={MockRender}
        onApplyEdit={vi.fn()}
      >
        List item
      </EditableBlock>,
    );
    act(() => {
      fireEvent.doubleClick(screen.getByText('List item'));
    });
    const textarea = screen.getByDisplayValue('List item');
    // textarea is inside a div with blue border
    expect(textarea.closest('div')?.style.border).toMatch(/9.*105.*218/);
  });
});
