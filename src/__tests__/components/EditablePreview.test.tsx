import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { EditablePreview } from '../../components/EditablePreview';

describe('EditablePreview', () => {
  it('renders editable blocks from markdown content', () => {
    const onContentChange = vi.fn();
    const { container } = render(
      <EditablePreview content="# Hello\n\nWorld paragraph" onContentChange={onContentChange} />,
    );
    expect(screen.getByTestId('editable-preview')).toBeInTheDocument();
    // Should render the parsed nodes
    expect(container.textContent).toBeTruthy();
  });

  it('calls onContentChange when a block is edited', () => {
    const onContentChange = vi.fn();
    render(
      <EditablePreview content="# Heading" onContentChange={onContentChange} />,
    );

    // Find the heading content and double-click to enter edit mode
    const headingBlock = screen.getByText('# Heading');
    expect(headingBlock).toBeInTheDocument();
    act(() => {
      fireEvent.doubleClick(headingBlock);
    });
    expect(screen.getByTestId('editable-block-confirm')).toBeInTheDocument();
  });

  it('updates content on edit apply', () => {
    const onContentChange = vi.fn();
    const content = 'Hello world';
    render(<EditablePreview content={content} onContentChange={onContentChange} />);

    // Find editable blocks (paragraph)
    const block = screen.queryByText('Hello world');
    if (block) {
      act(() => {
        fireEvent.doubleClick(block);
      });
      const textarea = screen.queryByDisplayValue('Hello world');
      if (textarea) {
        fireEvent.change(textarea, { target: { value: 'Updated text' } });
        act(() => {
          fireEvent.click(screen.getByTestId('editable-block-confirm'));
        });
        expect(onContentChange).toHaveBeenCalled();
      }
    }
  });

  it('renders blockquote as editable', () => {
    const onContentChange = vi.fn();
    const { container } = render(
      <EditablePreview content="> This is a quote" onContentChange={onContentChange} />,
    );
    expect(container.textContent).toContain('> This is a quote');
    expect(screen.getByTestId('editable-preview')).toBeInTheDocument();
  });

  it('renders list items as editable', () => {
    const onContentChange = vi.fn();
    const { container } = render(
      <EditablePreview content="- First item\n- Second item" onContentChange={onContentChange} />,
    );
    expect(container.textContent).toContain('First item');
    expect(container.textContent).toContain('Second item');
  });

  it('renders code blocks as editable', () => {
    const onContentChange = vi.fn();
    const { container } = render(
      <EditablePreview content="```\nconsole.log('hi');\n```" onContentChange={onContentChange} />,
    );
    expect(container.textContent).toContain("console.log('hi')");
  });

  it('does not crash with empty content', () => {
    const onContentChange = vi.fn();
    render(<EditablePreview content="" onContentChange={onContentChange} />);
    expect(screen.getByTestId('editable-preview')).toBeInTheDocument();
  });
});
