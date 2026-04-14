import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { InlineToolbar } from '../../components/EditablePreview/InlineToolbar';

describe('InlineToolbar', () => {
  it('does not render when visible is false', () => {
    const onFormat = vi.fn();
    const { container } = render(
      <InlineToolbar visible={false} position={{ top: 100, left: 200 }} onFormat={onFormat} />,
    );
    expect(container.innerHTML).toBe('');
    expect(screen.queryByTestId('inline-toolbar')).not.toBeInTheDocument();
  });

  it('does not render when position is null', () => {
    const onFormat = vi.fn();
    const { container } = render(
      <InlineToolbar visible={true} position={null} onFormat={onFormat} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when visible and position provided', () => {
    const onFormat = vi.fn();
    render(
      <InlineToolbar visible={true} position={{ top: 50, left: 100 }} onFormat={onFormat} />,
    );
    expect(screen.getByTestId('inline-toolbar')).toBeInTheDocument();
    expect(screen.getByText('**B**')).toBeInTheDocument();
    expect(screen.getByText('*I*')).toBeInTheDocument();
    expect(screen.getByText('~~S~~')).toBeInTheDocument();
    expect(screen.getByText('</>')).toBeInTheDocument();
    expect(screen.getByText('🔗')).toBeInTheDocument();
  });

  it('calls onFormat with correct type on button click', () => {
    const onFormat = vi.fn();
    render(
      <InlineToolbar visible={true} position={{ top: 0, left: 0 }} onFormat={onFormat} />,
    );

    fireEvent.click(screen.getByTestId('format-btn-bold'));
    expect(onFormat).toHaveBeenCalledWith('bold');

    fireEvent.click(screen.getByTestId('format-btn-italic'));
    expect(onFormat).toHaveBeenCalledWith('italic');

    fireEvent.click(screen.getByTestId('format-btn-strikethrough'));
    expect(onFormat).toHaveBeenCalledWith('strikethrough');

    fireEvent.click(screen.getByTestId('format-btn-code'));
    expect(onFormat).toHaveBeenCalledWith('code');

    fireEvent.click(screen.getByTestId('format-btn-link'));
    expect(onFormat).toHaveBeenCalledWith('link');
  });

  it('positions toolbar at given coordinates', () => {
    const onFormat = vi.fn();
    render(
      <InlineToolbar visible={true} position={{ top: 123, left: 456 }} onFormat={onFormat} />,
    );
    const toolbar = screen.getByTestId('inline-toolbar');
    expect(toolbar.style.top).toBe('123px');
    expect(toolbar.style.left).toBe('456px');
  });

  it('has fixed positioning', () => {
    const onFormat = vi.fn();
    render(
      <InlineToolbar visible={true} position={{ top: 0, left: 0 }} onFormat={onFormat} />,
    );
    expect(screen.getByTestId('inline-toolbar').style.position).toBe('fixed');
  });
});
