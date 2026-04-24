import { describe, it, expect } from 'vitest';
import { zhCN } from '../../i18n/zh-CN';
import { en } from '../../i18n/en';
import { jaJP } from '../../i18n/ja-JP';

/**
 * Ensures all hardcoded UI strings have been migrated to i18n keys.
 * Each locale must define all required keys with non-empty values.
 */
const REQUIRED_KEYS = [
  'loading.previewEngine',
  'fileTree.newFile',
  'fileTree.parentDir',
  'fileTree.refresh',
  'fileTree.close',
  'fileTree.selectFolder',
  'fileTree.searchPlaceholder',
  'quickOpen.title',
  'quickOpen.searchPlaceholder',
  'quickOpen.loading',
  'quickOpen.noFolder',
  'quickOpen.noMatch',
  'quickOpen.recent',
  'quickOpen.allFiles',
  'quickOpen.navigate',
  'quickOpen.open',
  'quickOpen.close',
] as const;

describe('i18n: hardcoded strings migration', () => {
  const locales = { 'zh-CN': zhCN, 'en': en, 'ja-JP': jaJP };

  for (const [localeName, dict] of Object.entries(locales)) {
    describe(`locale: ${localeName}`, () => {
      for (const key of REQUIRED_KEYS) {
        it(`has non-empty key "${key}"`, () => {
          expect(dict).toHaveProperty(key);
          expect((dict as Record<string, string>)[key]).toBeTruthy();
        });
      }
    });
  }

  it('all three locales have the same key count', () => {
    const zhKeys = Object.keys(zhCN).length;
    const enKeys = Object.keys(en).length;
    const jaKeys = Object.keys(jaJP).length;
    expect(enKeys).toBe(zhKeys);
    expect(jaKeys).toBe(zhKeys);
  });
});
