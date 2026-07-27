import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import type { PluginContext } from '../../../plugin-sandbox';
import { requestDiff } from './diff-client';
import type { DiffResult, DiffRow, InlineSegment } from './diff-core';
import { DiffToolbar } from './DiffToolbar';
import { DIFF_COLORS, type DiffSource, type DiffViewOptions } from './types';
import { createDiffT, getLocale } from './i18n';

const ROW_HEIGHT = 20;
const CONTEXT_LINES = 3;
const OPTIONS_KEY = 'marklite.diff.options';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

interface DiffOverlayProps {
  ctx: PluginContext;
  sourceA: DiffSource;
  sourceB: DiffSource;
  onClose: () => void;
}

interface PaneState {
  name: string;
  content: string | null;
}

type VisibleEntry = { kind: 'row'; row: DiffRow } | { kind: 'gap'; count: number };

function loadOptions(): DiffViewOptions {
  const base: DiffViewOptions = { ignoreWhitespace: false, ignoreCase: false, onlyDiffs: false, syncScroll: true };
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return base;
}

async function resolveSource(ctx: PluginContext, s: DiffSource): Promise<string> {
  if (s.kind === 'text') return s.text ?? '';
  if (s.path) {
    const c = await ctx.files.readFile(s.path);
    return c ?? '';
  }
  return '';
}

function rowBackground(text: string | null, type: DiffRow['type']): string {
  if (text === null) return DIFF_COLORS.fillerBg;
  if (type === 'added') return DIFF_COLORS.addBg;
  if (type === 'removed') return DIFF_COLORS.delBg;
  if (type === 'modified') return DIFF_COLORS.modBg;
  return 'transparent';
}

/**
 * Full-screen Beyond Compare-style side-by-side diff overlay with a floating
 * toolbar. Read-only. Diff computation is off-loaded to a Web Worker.
 */
export const DiffOverlay: React.FC<DiffOverlayProps> = ({ ctx, sourceA, sourceB, onClose }) => {
  const t = createDiffT(getLocale());
  const [paneA, setPaneA] = useState<PaneState>({ name: sourceA.name, content: null });
  const [paneB, setPaneB] = useState<PaneState>({ name: sourceB.name, content: null });
  const [result, setResult] = useState<DiffResult | null>(null);
  const [computing, setComputing] = useState(true);
  const [options, setOptions] = useState<DiffViewOptions>(loadOptions);
  const [currentBlock, setCurrentBlock] = useState(-1);
  const [splitPct, setSplitPct] = useState(50);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const panesRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const currentRef = useRef(currentBlock);
  useEffect(() => { currentRef.current = currentBlock; }, [currentBlock]);

  // Resolve both sources once on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [a, b] = await Promise.all([resolveSource(ctx, sourceA), resolveSource(ctx, sourceB)]);
      if (!alive) return;
      setPaneA({ name: sourceA.name, content: a });
      setPaneB({ name: sourceB.name, content: b });
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist options.
  useEffect(() => {
    try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(options)); } catch { /* ignore */ }
  }, [options]);

  // Recompute the diff whenever content or comparison options change.
  useEffect(() => {
    if (paneA.content == null || paneB.content == null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setComputing(true);
    const { promise, cancel } = requestDiff(paneA.content, paneB.content, {
      ignoreWhitespace: options.ignoreWhitespace,
      ignoreCase: options.ignoreCase,
    });
    let stale = false;
    promise.then((r) => {
      if (stale) return;
      setResult(r);
      setComputing(false);
      setCurrentBlock(r.blocks.length > 0 ? 0 : -1);
    });
    return () => { stale = true; cancel(); };
  }, [paneA.content, paneB.content, options.ignoreWhitespace, options.ignoreCase]);

  // Build the visible (optionally collapsed) row list plus block→position map.
  const { visible, blockPos } = useMemo(() => {
    if (!result) return { visible: [] as VisibleEntry[], blockPos: [] as number[] };
    const rows = result.rows;
    const keep = new Array<boolean>(rows.length).fill(!options.onlyDiffs);
    if (options.onlyDiffs) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].type !== 'equal') {
          for (let j = Math.max(0, i - CONTEXT_LINES); j <= Math.min(rows.length - 1, i + CONTEXT_LINES); j++) {
            keep[j] = true;
          }
        }
      }
    }
    const out: VisibleEntry[] = [];
    const pos: number[] = [];
    let gap = 0;
    for (let i = 0; i < rows.length; i++) {
      if (!keep[i]) { gap++; continue; }
      if (gap > 0) { out.push({ kind: 'gap', count: gap }); gap = 0; }
      const row = rows[i];
      if (row.blockIndex != null && pos[row.blockIndex] === undefined) pos[row.blockIndex] = out.length;
      out.push({ kind: 'row', row });
    }
    if (gap > 0) out.push({ kind: 'gap', count: gap });
    return { visible: out, blockPos: pos };
  }, [result, options.onlyDiffs]);

  const total = result?.blocks.length ?? 0;

  const goToBlock = useCallback((bi: number) => {
    if (!result || bi < 0 || bi >= result.blocks.length) return;
    setCurrentBlock(bi);
    const vi = blockPos[bi];
    if (vi == null) return;
    const top = Math.max(0, vi * ROW_HEIGHT - 60);
    leftPaneRef.current?.scrollTo({ top, behavior: 'smooth' });
    rightPaneRef.current?.scrollTo({ top, behavior: 'smooth' });
  }, [result, blockPos]);

  const nextBlock = useCallback(() => goToBlock(Math.min(currentRef.current + 1, total - 1)), [goToBlock, total]);
  const prevBlock = useCallback(() => goToBlock(Math.max(currentRef.current - 1, 0)), [goToBlock]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'F7') { e.preventDefault(); if (e.shiftKey) prevBlock(); else nextBlock(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, nextBlock, prevBlock]);

  const handleScroll = useCallback((from: 'L' | 'R') => (e: React.UIEvent<HTMLDivElement>) => {
    if (!options.syncScroll || syncing.current) return;
    syncing.current = true;
    const src = e.currentTarget;
    const dst = from === 'L' ? rightPaneRef.current : leftPaneRef.current;
    if (dst) { dst.scrollTop = src.scrollTop; dst.scrollLeft = src.scrollLeft; }
    requestAnimationFrame(() => { syncing.current = false; });
  }, [options.syncScroll]);

  const toggle = useCallback((key: keyof DiffViewOptions) => {
    setOptions((o) => ({ ...o, [key]: !o[key] }));
  }, []);

  const swap = useCallback(() => {
    setPaneA(paneB);
    setPaneB(paneA);
  }, [paneA, paneB]);

  const openFileInto = useCallback(async (side: 'A' | 'B') => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Text', extensions: ['md', 'markdown', 'txt', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'yml', 'yaml', 'xml', 'py'] }],
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) return;
      const content = await ctx.files.readFile(path);
      const name = path;
      if (side === 'A') setPaneA({ name, content: content ?? '' });
      else setPaneB({ name, content: content ?? '' });
    } catch {
      ctx.ui.showMessage(t('diff.openFileFailed'), 'error');
    }
  }, [ctx, t]);

  const handlePasteEvent = useCallback((side: 'L' | 'R', e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    if (side === 'L') setPaneA({ name: t('diff.clipboardLabel'), content: text });
    else setPaneB({ name: t('diff.clipboardLabel'), content: text });
  }, [t]);

  const onDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = panesRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(85, Math.max(15, pct)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const renderSegments = (segs: InlineSegment[], side: 'L' | 'R') => {
    const hl = side === 'L' ? DIFF_COLORS.delInline : DIFF_COLORS.addInline;
    return segs.map((s, idx) => (
      <span key={idx} style={s.changed ? { backgroundColor: hl, borderRadius: 2 } : undefined}>{s.text}</span>
    ));
  };

  const renderCell = (entry: VisibleEntry, side: 'L' | 'R', key: number) => {
    if (entry.kind === 'gap') {
      return (
        <div key={key} style={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '100%', width: 'max-content', backgroundColor: DIFF_COLORS.fillerBg, color: 'var(--text-tertiary, #888)', fontSize: 11, borderTop: '1px dashed var(--border-color, #3a3a4a)', borderBottom: '1px dashed var(--border-color, #3a3a4a)' }}>
          ⋯ {t('diff.collapsed', { count: entry.count })} ⋯
        </div>
      );
    }
    const row = entry.row;
    const lineNo = side === 'L' ? row.leftLineNo : row.rightLineNo;
    const text = side === 'L' ? row.leftText : row.rightText;
    const segs = side === 'L' ? row.leftSegments : row.rightSegments;
    const isCurrent = row.blockIndex != null && row.blockIndex === currentBlock;
    return (
      <div
        key={key}
        style={{
          height: ROW_HEIGHT,
          display: 'flex',
          minWidth: '100%',
          width: 'max-content',
          backgroundColor: rowBackground(text, row.type),
          boxShadow: isCurrent ? `inset 3px 0 0 var(--accent-color, #4a9eff)` : undefined,
        }}
      >
        <div style={{ position: 'sticky', left: 0, width: 48, flexShrink: 0, textAlign: 'right', padding: '0 6px', color: 'var(--text-tertiary, #777)', backgroundColor: rowBackground(text, row.type), userSelect: 'none', fontSize: 11, lineHeight: `${ROW_HEIGHT}px` }}>
          {lineNo ?? ''}
        </div>
        <div style={{ whiteSpace: 'pre', lineHeight: `${ROW_HEIGHT}px`, padding: '0 8px', flex: 1 }}>
          {segs ? renderSegments(segs, side) : text}
        </div>
      </div>
    );
  };

  const renderPane = (side: 'L' | 'R', pane: PaneState, ref: React.RefObject<HTMLDivElement | null>) => (
    <div style={{ ...(side === 'L' ? { flexBasis: `${splitPct}%`, flexGrow: 0, flexShrink: 0 } : { flex: 1 }), minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', flexShrink: 0, backgroundColor: 'var(--bg-secondary, #252533)', borderBottom: '1px solid var(--border-color, #3a3a4a)', fontSize: 12 }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary, #cbd5e1)' }} title={pane.name}>{pane.name}</span>
        <button
          type="button"
          title={t('diff.openFileIntoPane')}
          aria-label={t('diff.openFileIntoPane')}
          onClick={() => openFileInto(side === 'L' ? 'A' : 'B')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 20, border: 'none', borderRadius: 4, backgroundColor: 'transparent', color: 'var(--text-tertiary, #888)', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.1))'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <FolderOpen size={14} />
        </button>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        onPaste={(e) => handlePasteEvent(side, e)}
        onScroll={handleScroll(side)}
        style={{ flex: 1, overflow: 'auto', fontFamily: MONO, fontSize: 12, color: 'var(--text-primary, #e6e6e6)', outline: 'none' }}
      >
        {pane.content == null
          ? <div style={{ padding: 16, color: 'var(--text-tertiary, #888)' }}>{t('diff.computing')}</div>
          : visible.map((entry, i) => renderCell(entry, side, i))}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        backgroundColor: 'var(--bg-primary, #1a1a24)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <DiffToolbar
        t={t}
        nameA={paneA.name}
        nameB={paneB.name}
        stats={result?.stats ?? { added: 0, removed: 0, modified: 0 }}
        current={currentBlock + 1}
        total={total}
        options={options}
        onToggle={toggle}
        onFirst={() => goToBlock(0)}
        onPrev={prevBlock}
        onNext={nextBlock}
        onLast={() => goToBlock(total - 1)}
        onSwap={swap}
        onClose={onClose}
      />

      <div ref={panesRef} style={{ display: 'flex', flex: 1, minHeight: 0, paddingTop: 44, boxSizing: 'border-box' }}>
        {renderPane('L', paneA, leftPaneRef)}
        <div
          onMouseDown={onDividerDown}
          title=""
          style={{ width: 6, flexShrink: 0, cursor: 'col-resize', backgroundColor: 'var(--border-color, #3a3a4a)', backgroundClip: 'content-box', borderLeft: '2px solid transparent', borderRight: '2px solid transparent' }}
        />
        {renderPane('R', paneB, rightPaneRef)}
      </div>

      {result?.truncated && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--bg-tertiary, #2a2a38)', border: '1px solid var(--border-color, #3a3a4a)', color: 'var(--diff-del-text, #f85149)', fontSize: 13 }}>
          {t('diff.truncated')}
        </div>
      )}
      {!computing && result && !result.truncated && total === 0 && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--bg-tertiary, #2a2a38)', border: '1px solid var(--border-color, #3a3a4a)', color: 'var(--text-secondary, #cbd5e1)', fontSize: 13 }}>
          {t('diff.identical')}
        </div>
      )}
      {computing && (
        <div style={{ position: 'absolute', top: 52, right: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, backgroundColor: 'var(--bg-tertiary, #2a2a38)', border: '1px solid var(--border-color, #3a3a4a)', color: 'var(--text-secondary, #cbd5e1)', fontSize: 12 }}>
          <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          {t('diff.computing')}
        </div>
      )}
    </div>
  );
};
