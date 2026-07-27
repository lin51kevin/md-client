import type { DiffSource } from './types';

/** Fired to open the source picker (optionally prefilling the left file). */
export const OPEN_PICKER_EVENT = 'marklite-diff:open-picker';
/** Fired with two fully-resolved sources to launch the comparison overlay. */
export const START_COMPARE_EVENT = 'marklite-diff:start';

/** Open the compare source picker. `aPath` prefills the left side if given. */
export function openPicker(aPath?: string | null): void {
  window.dispatchEvent(new CustomEvent(OPEN_PICKER_EVENT, { detail: { aPath } }));
}

/** Launch the diff overlay for two prepared sources. */
export function startCompare(a: DiffSource, b: DiffSource): void {
  window.dispatchEvent(new CustomEvent(START_COMPARE_EVENT, { detail: { a, b } }));
}
