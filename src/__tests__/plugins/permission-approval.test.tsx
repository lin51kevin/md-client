import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PermissionApprovalModal } from '../../components/PermissionApprovalModal';
import type { PluginPermission } from '../../plugins/permissions';

const BASE_PERMISSIONS: PluginPermission[] = [
  'editor.read',
  'storage',
  'sidebar.panel',
  'editor.write',
  'file.read',
  'tauri.raw',
  'file.write',
];

const defaultProps = {
  visible: true,
  pluginName: 'Test Plugin',
  permissions: BASE_PERMISSIONS,
  onApprove: vi.fn(),
  onCancel: vi.fn(),
};

function renderModal(overrides = {}) {
  return render(<PermissionApprovalModal {...defaultProps} {...overrides} />);
}

describe('PermissionApprovalModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when visible is false', () => {
    const { container } = renderModal({ visible: false });
    expect(container.innerHTML).toBe('');
  });

  it('renders modal title with plugin name', () => {
    renderModal();
    expect(screen.getByText(/Test Plugin 请求以下权限/)).toBeInTheDocument();
  });

  it('renders all permissions', () => {
    renderModal();
    for (const p of BASE_PERMISSIONS) {
      expect(screen.getByText(p)).toBeInTheDocument();
    }
  });

  it('renders permission descriptions', () => {
    renderModal();
    expect(screen.getByText('读取编辑器内容')).toBeInTheDocument();
    expect(screen.getByText('访问插件存储')).toBeInTheDocument();
    expect(screen.getByText('读取文件内容')).toBeInTheDocument();
  });

  it('renders level badges', () => {
    renderModal();
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('dangerous permissions are unchecked by default', () => {
    renderModal();
    // tauri.raw and file.write should be unchecked
    const checkboxes = screen.getAllByRole('checkbox');
    // Find checkboxes near dangerous permissions
    const tauriRow = screen.getByText('tauri.raw').closest('[data-permission]')!;
    const fileWriteRow = screen.getByText('file.write').closest('[data-permission]')!;
    expect(within(tauriRow).getByRole('checkbox')).not.toBeChecked();
    expect(within(fileWriteRow).getByRole('checkbox')).not.toBeChecked();
  });

  it('non-dangerous permissions are checked by default', () => {
    renderModal();
    const editorRow = screen.getByText('editor.read').closest('[data-permission]')!;
    expect(within(editorRow).getByRole('checkbox')).toBeChecked();
  });

  it('dangerous permissions have warning text', () => {
    renderModal();
    expect(screen.getByText(/⚠.*tauri\.raw/)).toBeInTheDocument();
    expect(screen.getByText(/⚠.*file\.write/)).toBeInTheDocument();
  });

  it('calls onCancel when clicking cancel button', () => {
    renderModal();
    fireEvent.click(screen.getByText('取消'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when clicking overlay', () => {
    renderModal();
    const overlay = screen.getByText(/Test Plugin 请求以下权限/).closest('.fixed')!;
    fireEvent.click(overlay);
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('calls onCancel on Escape key', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('approve button is disabled when dangerous permissions exist but unchecked', () => {
    renderModal();
    const approveBtn = screen.getByRole('button', { name: /授予权限/ });
    expect(approveBtn).toBeDisabled();
  });

  it('approve button enables when all dangerous permissions are checked', () => {
    renderModal();
    // Check dangerous permissions
    const tauriRow = screen.getByText('tauri.raw').closest('[data-permission]')!;
    const fileWriteRow = screen.getByText('file.write').closest('[data-permission]')!;
    fireEvent.click(within(tauriRow).getByRole('checkbox'));
    fireEvent.click(within(fileWriteRow).getByRole('checkbox'));

    const approveBtn = screen.getByRole('button', { name: /授予权限/ });
    expect(approveBtn).not.toBeDisabled();
  });

  it('calls onApprove with granted permissions (excluding unchecked)', () => {
    renderModal();
    // Uncheck a non-dangerous permission
    const storageRow = screen.getByText('storage').closest('[data-permission]')!;
    fireEvent.click(within(storageRow).getByRole('checkbox'));

    // Check dangerous permissions
    const tauriRow = screen.getByText('tauri.raw').closest('[data-permission]')!;
    const fileWriteRow = screen.getByText('file.write').closest('[data-permission]')!;
    fireEvent.click(within(tauriRow).getByRole('checkbox'));
    fireEvent.click(within(fileWriteRow).getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /授予权限/ }));

    const granted = defaultProps.onApprove.mock.calls[0][0] as PluginPermission[];
    expect(granted).not.toContain('storage');
    expect(granted).toContain('tauri.raw');
    expect(granted).toContain('file.write');
  });

  it('approve button is enabled when no dangerous permissions requested', () => {
    renderModal({
      permissions: ['editor.read', 'storage'] as PluginPermission[],
    });
    const approveBtn = screen.getByRole('button', { name: /授予权限/ });
    expect(approveBtn).not.toBeDisabled();
  });
});
