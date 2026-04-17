import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  SlashCommandPopup,
  getFilteredCommandAt,
  getFilteredCommandCount,
  getSlashCommandToken,
} from '../../../plugins/official/ai-copilot/src/QuickCommands';
import { getQuickCommandList } from '../../../plugins/official/ai-copilot/src/intent-parser';
import { I18nContext } from '../../../i18n';
import type { Locale, TranslationKey } from '../../../i18n';
import { zhCN } from '../../../i18n/zh-CN';
import { en } from '../../../i18n/en';

const LOCALES: Record<Locale, Record<TranslationKey, string>> = {
  'zh-CN': zhCN,
  en,
};

function makeTranslator(locale: Locale) {
  return (key: TranslationKey, params?: Record<string, string | number>) => {
    let value: string = LOCALES[locale][key] ?? key;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      }
    }
    return value;
  };
}

function renderPopup(filter = '', locale: Locale = 'zh-CN') {
  const t = makeTranslator(locale);

  return render(
    <I18nContext.Provider value={{ locale, setLocale: vi.fn(), t }}>
      <SlashCommandPopup filter={filter} onSelect={vi.fn()} />
    </I18nContext.Provider>,
  );
}

describe('SlashCommandPopup', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('shows a localized description for the polish command', () => {
    renderPopup('/pol');

    expect(screen.getByText('/polish')).toBeInTheDocument();
    expect(screen.getByText('润色选中文本')).toBeInTheDocument();
  });

  it('shows localized descriptions for insert and delete commands', () => {
    renderPopup('', 'zh-CN');

    expect(screen.getByText('在光标处生成并插入内容')).toBeInTheDocument();
    expect(screen.getByText('删除选中文本或当前章节')).toBeInTheDocument();
  });

  it('renders a non-empty description for every quick command in both locales', () => {
    for (const locale of ['zh-CN', 'en'] as const) {
      const { unmount } = renderPopup('', locale);

      for (const command of getQuickCommandList()) {
        const button = screen.getByText(command.command).closest('button');
        expect(button).not.toBeNull();
        const description = button?.querySelectorAll('span')[1]?.textContent?.trim();
        expect(description).toBeTruthy();
        expect(description?.startsWith('aiCopilot.cmd.')).toBe(false);
      }

      unmount();
    }
  });

  it('keeps keyboard filtering aligned with localized command text', () => {
    const zhTranslator = makeTranslator('zh-CN');

    expect(getFilteredCommandCount('/插入', zhTranslator)).toBe(1);
    expect(getFilteredCommandAt('/插入', 0, zhTranslator)).toBe('/insert');
  });

  it('only keeps autocomplete active while editing the slash command token', () => {
    expect(getSlashCommandToken('/translate')).toBe('translate');
    expect(getSlashCommandToken('/插入')).toBe('插入');
    expect(getSlashCommandToken('/translate french')).toBeNull();
    expect(getSlashCommandToken('translate')).toBeNull();
  });

  it('can rerender from no matches to matches without hook order issues', () => {
    const { rerender } = render(
      <I18nContext.Provider value={{ locale: 'zh-CN', setLocale: vi.fn(), t: makeTranslator('zh-CN') }}>
        <SlashCommandPopup filter="zzzzz" onSelect={vi.fn()} />
      </I18nContext.Provider>,
    );

    rerender(
      <I18nContext.Provider value={{ locale: 'zh-CN', setLocale: vi.fn(), t: makeTranslator('zh-CN') }}>
        <SlashCommandPopup filter="pol" onSelect={vi.fn()} />
      </I18nContext.Provider>,
    );

    expect(screen.getByText('/polish')).toBeInTheDocument();
  });
});
