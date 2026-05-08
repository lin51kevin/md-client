/**
 * Type declarations for CodeMirror syntax tree nodes.
 *
 * Used by cmSymbolBreadcrumb and other CodeMirror utilities that
 * traverse the syntax tree.
 */

/** A CodeMirror syntax tree node. */
export interface CMSyntaxNode {
  /** The grammar name of this node (e.g. 'VariableName', 'String', 'Comment'). */
  type: string;
  /** The start position of this node in the document. */
  from: number;
  /** The end position of this node in the document. */
  to: number;
  /** The first child node, if any. */
  firstChild: CMSyntaxNode | null;
  /** The last child node, if any. */
  lastChild: CMSyntaxNode | null;
  /** The parent node (not always available depending on the tree build mode). */
  parent?: CMSyntaxNode | null;
  /** Iterate over child nodes. */
  cursor(): CMSyntaxCursor;
}

/** Cursor for iterating CodeMirror syntax tree. */
export interface CMSyntaxCursor {
  /** Move to the first child. Returns false if none. */
  firstChild(): boolean;
  /** Move to the next sibling. Returns false if none. */
  nextSibling(): boolean;
  /** The current node. */
  node: CMSyntaxNode;
}
