import { useState, useCallback } from 'react';

/**
 * 通用持久化布尔值 hook。
 * 读写 localStorage，localStorage 不可用时回退到内存状态。
 *
 * @param key        存储键名
 * @param defaultValue 默认值
 */
export function useLocalStorageBool(
  key: string,
  defaultValue: boolean,
): [boolean, (value: boolean) => void] {
  const [state, setState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? defaultValue : saved === 'true';
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: boolean) => {
      setState(value);
      try {
        localStorage.setItem(key, String(value));
      } catch {
        /* ignore quota errors */
      }
    },
    [key],
  );

  return [state, setValue];
}

/**
 * 通用持久化数字值 hook。
 * 读写 localStorage，localStorage 不可用时回退到内存状态。
 *
 * @param key        存储键名
 * @param defaultValue 默认值
 */
export function useLocalStorageNumber(
  key: string,
  defaultValue: number,
): [number, (value: number) => void] {
  const [state, setState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return defaultValue;
      const parsed = parseInt(saved, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: number) => {
      setState(value);
      try {
        localStorage.setItem(key, String(value));
      } catch {
        /* ignore quota errors */
      }
    },
    [key],
  );

  return [state, setValue];
}

/**
 * 通用持久化字符串值 hook。
 * 读写 localStorage，localStorage 不可用时回退到内存状态。
 *
 * @param key        存储键名
 * @param defaultValue 默认值
 */
export function useLocalStorageString(
  key: string,
  defaultValue: string,
): [string, (value: string) => void] {
  const [state, setState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? defaultValue : saved;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: string) => {
      setState(value);
      try {
        localStorage.setItem(key, value);
      } catch {
        /* ignore quota errors */
      }
    },
    [key],
  );

  return [state, setValue];
}
