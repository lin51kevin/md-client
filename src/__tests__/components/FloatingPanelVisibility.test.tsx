import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { FloatingPanel } from '../../components/FloatingPanel';

describe('FloatingPanel — visibility gating', () => {
  const child = (dragHandle: (e: React.MouseEvent) => void) => (
    <div data-testid="panel-content" onMouseDown={dragHandle}>content</div>
  );

  it('renders children when visible=true', () => {
    render(<FloatingPanel visible={true}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
  });

  it('hides (display:none) when visible=false but keeps children mounted', () => {
    render(<FloatingPanel visible={false}>{child}</FloatingPanel>);
    // Children remain in DOM (state preserved) but panel is hidden
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    expect(screen.getByTestId('floating-panel-root')).toHaveStyle('display: none');
  });

  it('hides when viewMode is slide (visible=false)', () => {
    const viewMode = 'slide';
    const showAIPanel = true;
    const showSettings = false;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    expect(screen.getByTestId('floating-panel-root')).toHaveStyle('display: none');
  });

  it('hides when viewMode is mindmap', () => {
    const viewMode = 'mindmap';
    const showAIPanel = true;
    const showSettings = false;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    expect(screen.getByTestId('floating-panel-root')).toHaveStyle('display: none');
  });

  it('hides when settings modal is open', () => {
    const viewMode = 'split';
    const showAIPanel = true;
    const showSettings = true;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    expect(screen.getByTestId('floating-panel-root')).toHaveStyle('display: none');
  });

  it('shows when normal mode, settings closed, panel toggled on', () => {
    const viewMode = 'split';
    const showAIPanel = true;
    const showSettings = false;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
  });

  it('hides when showAIPanel=false regardless of mode', () => {
    const viewMode = 'split';
    const showAIPanel = false;
    const showSettings = false;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    expect(screen.getByTestId('floating-panel-root')).toHaveStyle('display: none');
  });

  it('shows when preview mode (not slide/mindmap)', () => {
    const viewMode = 'preview';
    const showAIPanel = true;
    const showSettings = false;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
  });

  it('preserves children across visibility toggles (no remount)', () => {
    const { rerender } = render(<FloatingPanel visible={true}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    // Hide
    rerender(<FloatingPanel visible={false}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    // Show again — same DOM node, state preserved
    rerender(<FloatingPanel visible={true}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
  });
});
