import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UpdateNotification } from '../../components/UpdateNotification';

describe('UpdateNotification', () => {
  const defaultProps = {
    version: '1.0.0',
    onDownload: vi.fn(),
    onDismiss: vi.fn(),
  };

  it('should render version info', () => {
    render(<UpdateNotification {...defaultProps} />);
    expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
  });

  it('should render update button', () => {
    render(<UpdateNotification {...defaultProps} />);
    expect(screen.getByRole('button', { name: /更新|update/i })).toBeInTheDocument();
  });

  it('should render dismiss button', () => {
    render(<UpdateNotification {...defaultProps} />);
    expect(screen.getByRole('button', { name: /忽略|dismiss/i })).toBeInTheDocument();
  });

  it('should call onDownload when update clicked', () => {
    render(<UpdateNotification {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /更新|update/i }));
    expect(defaultProps.onDownload).toHaveBeenCalled();
  });

  it('should call onDismiss when dismiss clicked', () => {
    render(<UpdateNotification {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /忽略|dismiss/i }));
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it('should show download progress', () => {
    render(<UpdateNotification {...defaultProps} downloadProgress={50} downloading />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show restart button when download complete', () => {
    render(<UpdateNotification {...defaultProps} downloadProgress={100} readyToRestart onRestart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /重启|restart/i })).toBeInTheDocument();
  });

  it('should render release notes when provided', () => {
    render(<UpdateNotification {...defaultProps} releaseNotes="Bug fixes" />);
    expect(screen.getByText('Bug fixes')).toBeInTheDocument();
  });
});
