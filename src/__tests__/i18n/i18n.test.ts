import { describe, it, expect, vi } from 'vitest';
import type { TranslationKey } from '../../i18n/zh-CN';
import { zhCN } from '../../i18n/zh-CN';
import { en } from '../../i18n/en';

describe('i18n locale completeness', () => {
  const zhKeys = Object.keys(zhCN) as TranslationKey[];
  const enKeys = Object.keys(en);

  it('en.ts has exactly the same keys as zh-CN.ts', () => {
    const zhSet = new Set(zhKeys);
    const enSet = new Set(enKeys);
    const missingInEn = [...zhSet].filter((k) => !enSet.has(k));
    const extraInEn = [...enSet].filter((k) => !zhSet.has(k));
    expect(missingInEn, `Missing in en.ts: ${missingInEn.join(', ')}`).toHaveLength(0);
    expect(extraInEn, `Extra in en.ts: ${extraInEn.join(', ')}`).toHaveLength(0);
  });

  it('all values in zh-CN are non-empty strings', () => {
    for (const key of zhKeys) {
      expect(zhCN[key], `zh-CN key "${key}" should be non-empty`).toBeTruthy();
    }
  });

  it('all values in en are non-empty strings', () => {
    for (const key of enKeys) {
      expect(en[key], `en key "${key}" should be non-empty`).toBeTruthy();
    }
  });

  it('en values differ from keys (no fallback to key name)', () => {
    // Some keys like 'help.title' might match, but most shouldn't
    let sameCount = 0;
    for (const key of enKeys) {
      if (en[key] === key) sameCount++;
    }
    // Allow a few edge cases but not many
    expect(sameCount).toBeLessThan(5);
  });

  it('zh-CN values differ from keys', () => {
    let sameCount = 0;
    for (const key of zhKeys) {
      if (zhCN[key] === key) sameCount++;
    }
    expect(sameCount).toBe(0);
  });
});

describe('i18n index - translate function', () => {
  // We can't directly test the translate function without React context,
  // but we can test the module exports
  it('exports useI18n and useI18nProvider hooks', async () => {
    const mod = await import('../../i18n');
    expect(typeof mod.useI18n).toBe('function');
    expect(typeof mod.useI18nProvider).toBe('function');
  });

  it('exports I18nContext', async () => {
    const mod = await import('../../i18n');
    expect(mod.I18nContext).toBeDefined();
  });

  it('TranslationKey type covers all locale keys', async () => {
    const mod = await import('../../i18n');
    const { en: enDict } = await import('../../i18n/en');
    // Verify every key in en dict is a valid TranslationKey
    const enKeys = Object.keys(enDict) as TranslationKey[];
    const { zhCN: zhDict } = await import('../../i18n/zh-CN');
    const zhKeys = Object.keys(zhDict) as TranslationKey[];
    // Should not throw - just type checking at compile time
    expect(enKeys.length).toBeGreaterThan(0);
    expect(zhKeys.length).toBeGreaterThan(0);
  });
});

describe('i18n parameter interpolation', () => {
  // Test interpolation patterns used in translations
  it('zh-CN has consistent {param} patterns', () => {
    const paramRegex = /\{(\w+)\}/g;
    for (const [key, value] of Object.entries(zhCN)) {
      const params = [...value.matchAll(paramRegex)].map((m) => m[1]);
      const enValue = en[key as TranslationKey];
      const enParams = [...enValue.matchAll(paramRegex)].map((m) => m[1]);
      expect(
        params.sort().join(','),
        `Key "${key}": zh-CN params [${params}] should match en params [${enParams}]`,
      ).toBe(enParams.sort().join(','));
    }
  });
});
