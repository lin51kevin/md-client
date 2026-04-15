import { useState, useCallback } from 'react';

export interface TypewriterOptions {
  dimOthers: boolean;
  hideUI: boolean;
  showDuration: boolean;
}

const STORAGE_KEY = 'marklite-typewriter-options';

const DEFAULT_OPTIONS: TypewriterOptions = {
  dimOthers: false,
  hideUI: false,
  showDuration: false,
};

function loadOptions(): TypewriterOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_OPTIONS, ...JSON.parse(raw) } : DEFAULT_OPTIONS;
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export function useTypewriterOptions(): [TypewriterOptions, (update: Partial<TypewriterOptions>) => void] {
  const [options, setOptions] = useState<TypewriterOptions>(loadOptions);

  const updateOptions = useCallback((update: Partial<TypewriterOptions>) => {
    setOptions(prev => {
      const next = { ...prev, ...update };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return [options, updateOptions];
}
