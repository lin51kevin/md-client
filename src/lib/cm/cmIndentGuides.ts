/**
 * Indent guides extension for code editing mode.
 *
 * Renders vertical guide lines at each indentation level using a CodeMirror
 * ViewPlugin. Similar to VS Code indent guides. Only used in code mode.
 */
import type { Extension, RangeSetBuilder } from '@codemirror/state';
import {
  StateField,
  StateEffect,
  type StateEffectType,
} from '@codemirror/state';
import {
  ViewPlugin,
  type ViewUpdate,
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import { syntaxTree } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/** Width of one indent level (defaults to 2 spaces) */
const INDENT_WIDTH = 2;
/** Color used for guide lines */
const GUIDE_COLOR = 'rgba(128, 128, 128, 0.2)';

/**
 * Widget that renders a single indent guide as a vertical line.
 */
class IndentGuideWidget extends WidgetType {
  constructor(readonly level: number) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-indent-guide';
    span.setAttribute('aria-hidden', 'true');
    span.style.borderLeft = `1px solid ${GUIDE_COLOR}`;
    span.style.display = 'inline';
    span.style.width = '0px';
    span.style.marginLeft = `${this.level * INDENT_WIDTH}ch`;
    return span;
  }

  eq(other: IndentGuideWidget): boolean {
    return other.level === this.level;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

/** Re-exported types for testing convenience */
export type { Extension };

/**
 * Build indent guide decorations for the visible viewport.
 */
function buildDecorations(view: EditorView): DecorationSet {
  const builder = view.state.facet(indentUnit) || '  ';
  const unitLen = builder.length || INDENT_WIDTH;

  const widgets: RangeSetBuilder<Decoration> = [];
  // We need at least 1 for from/to even if no decorations
  widgets.add(view.viewport.from, view.viewport.to, Decoration.none);

  for (const { from, to } of view.visibleRanges) {
    const tree = syntaxTree(view.state);
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const indent = line.text.match(/^(\s*)/)?.[1].length ?? 0;
      const levels = Math.floor(indent / unitLen);

      if (levels > 0) {
        // Place guide widget at the start of the line content
        const insertPos = line.from;
        for (let lv = 0; lv < levels; lv++) {
          widgets.add(
            insertPos,
            insertPos,
            Decoration.widget({
              widget: new IndentGuideWidget(lv),
              side: -1,
            })
          );
        }
      }

      pos = line.to + 1;
    }
  }

  // Use Decoration.set to create the final set
  const decoSet = Decoration.set(
    (widgets as any).finish?.() ?? [],
    true
  );

  // Simpler approach: just build decorations array
  const decos: Range<string>[] = [];
  // Actually, let me use the simpler API
  return buildDecosSimple(view, unitLen);
}

function buildDecosSimple(view: EditorView, unitLen: number): DecorationSet {
  const decos: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const indent = line.text.match(/^(\s*)/)?.[1].length ?? 0;
      const levels = Math.floor(indent / unitLen);

      if (levels > 0) {
        for (let lv = 0; lv < levels; lv++) {
          decos.push(
            Decoration.widget({
              widget: new IndentGuideWidget(lv),
              side: -1,
            }).range(line.from)
          );
        }
      }

      pos = line.to + 1;
    }
  }

  return Decoration.set(decos, true);
}

type Range<T> = { from: number; to: number; value: T };

/**
 * ViewPlugin that manages indent guide decorations.
 */
const indentGuidesPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecosSimple(view, getUnitLen(view));
    }

    update(update: ViewUpdate) {
      if (update.viewportChanged || update.docChanged) {
        this.decorations = buildDecosSimple(update.view, getUnitLen(update.view));
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

function getUnitLen(view: EditorView): number {
  const unit = view.state.facet(indentUnit);
  return unit?.length || INDENT_WIDTH;
}

/**
 * Returns the indent guides extension for CodeMirror.
 * Can be used directly as a synchronous extension.
 */
export function indentGuidesExtension(): Extension {
  return indentGuidesPlugin;
}

/**
 * Async version for lazy-loading pattern (returns the same extension).
 */
export async function loadIndentGuidesExtension(): Promise<Extension> {
  return indentGuidesExtension();
}
