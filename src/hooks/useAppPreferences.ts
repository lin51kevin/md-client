/**
 * useAppPreferences — aggregates all user preference state for AppShell.
 *
 * Wraps usePreferences + useTypewriterOptions into a single call,
 * reducing the number of hook invocations in AppShell.
 */
import { usePreferences } from './usePreferences';
import { useTypewriterOptions } from './useTypewriterOptions';

export function useAppPreferences() {
  const prefs = usePreferences();
  const [typewriterOptions, setTypewriterOptions] = useTypewriterOptions();
  return { ...prefs, typewriterOptions, setTypewriterOptions };
}
