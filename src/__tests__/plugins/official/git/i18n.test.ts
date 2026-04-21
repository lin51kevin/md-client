import { describe, it, expect } from 'vitest';
import { getGitI18n, GIT_I18N_KEYS } from '../../../../plugins/official/git/src/i18n';

describe('git plugin i18n', () => {
  const requiredKeys = GIT_I18N_KEYS;

  it('exports a list of required i18n keys', () => {
    expect(requiredKeys.length).toBeGreaterThan(0);
    expect(requiredKeys).toContain('git.panel');
    expect(requiredKeys).toContain('git.commit');
    expect(requiredKeys).toContain('git.noRepo');
  });

  it('zh-CN locale has all required keys', () => {
    const strings = getGitI18n('zh-CN');
    for (const key of requiredKeys) {
      expect(strings[key], `missing zh-CN key: ${key}`).toBeTruthy();
    }
  });

  it('en locale has all required keys', () => {
    const strings = getGitI18n('en');
    for (const key of requiredKeys) {
      expect(strings[key], `missing en key: ${key}`).toBeTruthy();
    }
  });

  it('ja-JP locale has all required keys', () => {
    const strings = getGitI18n('ja-JP');
    for (const key of requiredKeys) {
      expect(strings[key], `missing ja-JP key: ${key}`).toBeTruthy();
    }
  });

  it('unknown locale falls back to English', () => {
    const strings = getGitI18n('fr-FR');
    expect(strings['git.panel']).toBe('Source Control');
    expect(strings['git.commit']).toBe('Commit');
  });
});
