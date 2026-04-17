import { useState, useCallback } from 'react';
import type { InputDialogConfig } from '../components/modal/InputDialog';

export interface InputDialogState {
  config: InputDialogConfig;
  resolve: (value: string | null) => void;
}

export function useInputDialog() {
  const [inputDialogState, setInputDialogState] = useState<InputDialogState | null>(null);

  const promptUser = useCallback((config: InputDialogConfig): Promise<string | null> => {
    return new Promise((resolve) => {
      setInputDialogState({ config, resolve });
    });
  }, []);

  return { inputDialogState, setInputDialogState, promptUser };
}
