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

  it('renders nothing when visible=false', () => {
    render(<FloatingPanel visible={false}>{child}</FloatingPanel>);
    expect(screen.queryByTestId('panel-content')).toBeNull();
  });

  it('hides when viewMode is slide (visible=false)', () => {
    // Simulate App.tsx expression: showAIPanel && viewMode !== 'slide'
    const viewMode = 'slide';
    const showAIPanel = true;
    const showSettings = false;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.queryByTestId('panel-content')).toBeNull();
  });

  it('hides when viewMode is mindmap', () => {
    const viewMode = 'mindmap';
    const showAIPanel = true;
    const showSettings = false;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.queryByTestId('panel-content')).toBeNull();
  });

  it('hides when settings modal is open', () => {
    const viewMode = 'split';
    const showAIPanel = true;
    const showSettings = true;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.queryByTestId('panel-content')).toBeNull();
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
    expect(screen.queryByTestId('panel-content')).toBeNull();
  });

  it('shows when preview mode (not slide/mindmap)', () => {
    const viewMode = 'preview';
    const showAIPanel = true;
    const showSettings = false;
    const visible = showAIPanel && !showSettings && viewMode !== 'slide' && viewMode !== 'mindmap';
    render(<FloatingPanel visible={visible}>{child}</FloatingPanel>);
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
  });
});
