import { Decoration, type DecorationSet, type ViewUpdate, EditorView } from '@codemirror/view';
import { RangeSetBuilder, type Extension, Prec } from '@codemirror/state';
import { ViewPlugin } from '@codemirror/view';

const BRACKET_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

function getBracketColor(depth: number): string {
  return BRACKET_COLORS[depth % BRACKET_COLORS.length];
}

function bracketDeco(depth: number): Decoration {
  const color = getBracketColor(depth);
  return Decoration.mark({
    class: `cm-rb-depth-${depth % BRACKET_COLORS.length}`,
    attributes: { style: `color: ${color}` },
  });
}

const openBrackets = new Set(['(', '[', '{']);
const closeBrackets = new Set([')', ']', '}']);

const rainbowBracketsPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }
  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to } of view.visibleRanges) {
      let depth = 0;
      for (let pos = from; pos < to; pos++) {
        const ch = view.state.doc.sliceString(pos, pos + 1);
        if (openBrackets.has(ch)) {
          builder.add(pos, pos + 1, bracketDeco(depth));
          depth++;
        } else if (closeBrackets.has(ch) && depth > 0) {
          depth--;
          builder.add(pos, pos + 1, bracketDeco(depth));
        }
      }
    }
    return builder.finish();
  }
}, {
  decorations: v => v.decorations,
});

export function rainbowBrackets(): Extension {
  return [
    Prec.highest(rainbowBracketsPlugin),
  ];
}
