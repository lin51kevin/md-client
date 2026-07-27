/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { PluginContext } from '../../../plugin-sandbox';
import { ComparePicker } from './ComparePicker';
import { DiffOverlay } from './DiffOverlay';
import { OPEN_PICKER_EVENT, START_COMPARE_EVENT } from './events';
import type { DiffSource } from './types';

/**
 * Persistent, always-mounted controller that owns the source picker and the
 * diff overlay. Any entry point (command, editor context menu, status bar,
 * sidebar panel) drives it via window events, so comparison can be launched
 * regardless of whether the sidebar panel is open.
 */
const DiffControllerApp: React.FC<{ ctx: PluginContext }> = ({ ctx }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [prefillA, setPrefillA] = useState<string | undefined>(undefined);
  const [sources, setSources] = useState<{ a: DiffSource; b: DiffSource } | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const path = (e as CustomEvent).detail?.aPath as string | undefined | null;
      setPrefillA(path ?? undefined);
      setPickerOpen(true);
    };
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent).detail as { a: DiffSource; b: DiffSource };
      if (!detail?.a || !detail?.b) return;
      setSources({ a: detail.a, b: detail.b });
      setPickerOpen(false);
    };
    window.addEventListener(OPEN_PICKER_EVENT, onOpen);
    window.addEventListener(START_COMPARE_EVENT, onStart);
    return () => {
      window.removeEventListener(OPEN_PICKER_EVENT, onOpen);
      window.removeEventListener(START_COMPARE_EVENT, onStart);
    };
  }, []);

  return (
    <>
      {pickerOpen && (
        <ComparePicker
          ctx={ctx}
          variant="modal"
          initialAPath={prefillA}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {sources && (
        <DiffOverlay
          ctx={ctx}
          sourceA={sources.a}
          sourceB={sources.b}
          onClose={() => setSources(null)}
        />
      )}
    </>
  );
};

/**
 * Singleton key on `window`. Dev-mode plugin loading imports a fresh module
 * instance on every activation (via a blob URL), so module-level state does not
 * persist. Storing the root on `window` guarantees exactly one controller —
 * and thus one overlay — even when activation runs more than once (e.g. React
 * StrictMode double-invokes the auto-activate effect in development).
 */
const ROOT_KEY = '__marklite_diff_root__';
const CONTAINER_ID = 'marklite-diff-root';

/** Mount the controller into a dedicated body container (idempotent). */
export function mountDiffController(ctx: PluginContext): void {
  const w = window as unknown as Record<string, unknown>;
  if (w[ROOT_KEY]) return;
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  document.body.appendChild(container);
  const root = createRoot(container);
  w[ROOT_KEY] = root;
  root.render(React.createElement(DiffControllerApp, { ctx }));
}

/** Unmount the controller and remove its container. */
export function unmountDiffController(): void {
  const w = window as unknown as Record<string, unknown>;
  const root = w[ROOT_KEY] as Root | undefined;
  if (root) {
    root.unmount();
    delete w[ROOT_KEY];
  }
  document.getElementById(CONTAINER_ID)?.remove();
}
