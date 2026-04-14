import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useContext } from 'react';
import { I18nContext } from '../../i18n';
import type { Locale } from '../../i18n';
import { zhCN } from '../../i18n/zh-CN';
import { en } from '../../i18n/en';

// Minimal PermissionApprovalModal mock for i18n integration test
vi.mock('../../plugins/permission-approval', () => {
  const React = require('react');
  return {
    PermissionApprovalModal: ({ permissions, pluginName, onApprove, onCancel, dangerousPermissions }: any) => (
      <div data-testid="perm-modal">
        <span data-testid="perm-title">{pluginName}</span>
        <button onClick={onCancel}>perm.cancel</button>
        <button onClick={onApprove}>perm.approve</button>
        {permissions.map((p: any, i: number) => (
          <div key={i} data-testid={`perm-${i}`}>{p.description}</div>
        ))}
        {dangerousPermissions?.map((dp: any, i: number) => (
          <div key={i} data-testid={`dangerous-${i}`}>perm.dangerousWarning</div>
        ))}
      </div>
    ),
  };
});

// Simple component that uses i18n in plugin permission context
function PermTestComponent() {
  const { t, locale } = useContext(I18nContext) as { t: any; locale: Locale };
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="title">{t('perm.title', { name: 'TestPlugin' })}</span>
      <span data-testid="cancel">{t('perm.cancel')}</span>
      <span data-testid="approve">{t('perm.approve')}</span>
      <span data-testid="danger">{t('perm.dangerousWarning', { desc: 'fs:read' })}</span>
    </div>
  );
}

function renderWithI18n(locale: Locale) {
  const setLocale = vi.fn();
  const t = (key: string, params?: Record<string, string | number>) => {
    const dict = locale === 'zh-CN' ? zhCN : en;
    let val: string = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return val;
  };

  return render(
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      <PermTestComponent />
    </I18nContext.Provider>
  );
}

describe('PermissionApprovalModal i18n integration', () => {
  it('shows Chinese locale strings', () => {
    renderWithI18n('zh-CN');
    expect(screen.getByTestId('locale').textContent).toBe('zh-CN');
    expect(screen.getByTestId('title').textContent).toContain('TestPlugin');
    expect(screen.getByTestId('cancel').textContent).toBe('取消');
    expect(screen.getByTestId('approve').textContent).toBe('授予权限');
    expect(screen.getByTestId('danger').textContent).toContain('fs:read');
  });

  it('shows English locale strings', () => {
    renderWithI18n('en');
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('cancel').textContent).toBe('Cancel');
    expect(screen.getByTestId('approve').textContent).toBe('Grant Permissions');
  });

  it('interpolates {name} and {desc} parameters correctly', () => {
    renderWithI18n('zh-CN');
    expect(screen.getByTestId('title').textContent).toBe('TestPlugin 请求以下权限');
    expect(screen.getByTestId('danger').textContent).toContain('fs:read');
  });

  it('English interpolation works', () => {
    renderWithI18n('en');
    expect(screen.getByTestId('title').textContent).toBe('TestPlugin is requesting the following permissions');
  });
});
