/**
 * Indent guides extension for code editing mode.
 *
 * Renders vertical guide lines at each indentation level using a CodeMirror
 * ViewPlugin. Similar to VS Code indent guides. Only used in code mode.
 */
import type { Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { indentUnit } from '@codemirror/language';

const INDENT_WIDTH = 2;
const GUIDE_COLOR = 'rgba(128, 128, 128, 0.2)';

/** Widget that renders a single indent guide line at a given indentation level. */
class IndentGuideWidget extends WidgetType {
  constructor(readonly level: number) { super(); }

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

  ignoreEvent(): boolean { return true; }
}

function getUnitLen(view: EditorView): number {
  const unit = view.state.facet(indentUnit);
  return unit?.length || INDENT_WIDTH;
}

function buildDecorations(view: EditorView, unitLen: number): DecorationSet {
  const decos: { from: number; to: number; value: Decoration }[] = [];

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

const indentGuidesPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view, getUnitLen(view));
    }
    update(update: ViewUpdate) {
      if (update.viewportChanged || update.docChanged) {
        this.decorations = buildDecorations(update.view, getUnitLen(update.view));
      }
    }
  },
  { decorations: (v) => v.decorations }
);

/**
 * Returns the indent guides extension for CodeMirror.
 */
export function indentGuidesExtension(): Extension {
  return indentGuidesPlugin;
}

/**
 * Async version for lazy-loading pattern (same as sync, returns a resolved Promise).
 */
export async function loadIndentGuidesExtension(): Promise<Extension> {
  return indentGuidesExtension();
}
