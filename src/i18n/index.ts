import { useState, useCallback, createContext, useContext } from 'react';
import { zhCN, type TranslationKey } from './zh-CN';
import { en } from './en';
import { StorageKeys } from '../lib/storage-keys';

export type { TranslationKey };

export type Locale = 'zh-CN' | 'en';

const STORAGE_KEY = StorageKeys.LOCALE;
const LOCALES: Record<Locale, Record<TranslationKey, string>> = {
  'zh-CN': zhCN,
  'en': en,
};

function getSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh-CN') return saved;
  } catch { /* ignore */ }
  // Auto-detect from browser language
  return navigator.language.startsWith('zh') ? 'zh-CN' : 'en';
}

function saveLocale(locale: Locale): void {
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
}

/** Translate a key, interpolating {param} tokens */
function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dict = LOCALES[locale];
  let str: string = dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

// ── Standalone translator (for non-React code) ──────────────────────────────

/** Get a translation function based on the currently saved locale. */
export function getT(): (key: TranslationKey, params?: Record<string, string | number>) => string {
  const locale = getSavedLocale();
  return (key, params) => translate(locale, key, params);
}

// ── React Context ────────────────────────────────────────────────────────────

interface I18nContext {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContext>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key, params) => translate('zh-CN', key, params),
});

export function useI18n(): I18nContext {
  return useContext(I18nContext);
}

/** Top-level hook that owns locale state; used once in App.tsx */
export function useI18nProvider(): I18nContext {
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    saveLocale(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );

  return { locale, setLocale, t };
}
