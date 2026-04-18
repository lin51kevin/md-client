/**
 * AppProviders — wraps the application with all required context providers.
 *
 * Currently only I18nContext, but designed as a single place to add more
 * providers (theme, router, etc.) without cluttering App.tsx.
 */

import React from 'react';
import { I18nContext, useI18nProvider } from '../i18n';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const i18n = useI18nProvider();
  return (
    <I18nContext.Provider value={i18n}>
      {children}
    </I18nContext.Provider>
  );
}
