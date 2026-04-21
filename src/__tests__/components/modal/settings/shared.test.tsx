import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingItem, ToggleSwitch } from '../../../../components/modal/settings/shared';

describe('ToggleSwitch', () => {
  it('renders with role="switch"', () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('aria-checked="true" when checked=true', () => {
    render(<ToggleSwitch checked={true} onChange={vi.fn()} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('aria-checked="false" when checked=false', () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange(true) when toggled from off', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange(false) when toggled from on', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('SettingItem', () => {
  it('renders label text', () => {
    render(<SettingItem label="My Label" description="My Desc"><span>child</span></SettingItem>);
    expect(screen.getByText('My Label')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<SettingItem label="My Label" description="My Desc"><span>child</span></SettingItem>);
    expect(screen.getByText('My Desc')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<SettingItem label="L" description="D"><button>click me</button></SettingItem>);
    expect(screen.getByRole('button', { name: 'click me' })).toBeInTheDocument();
  });
});
