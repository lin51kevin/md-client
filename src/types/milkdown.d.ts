/**
 * Type declarations for Milkdown / ProseMirror transaction context.
 *
 * Milkdown's transaction listener callback receives opaque context
 * objects whose types are not always exported.  These declarations
 * let us type the listener parameters without resorting to `any`.
 */

/** Node from @milkdown/prose/state (simplified for our usage). */
export interface MilkdownNode {
  nodeSize: number;
  /** The type name of this node (e.g. 'doc', 'paragraph', 'text'). */
  type: { name: string };
}

/** Transaction context provided by Milkdown's transaction listener. */
export interface MilkdownTransactionContext {
  /** The new document state after the transaction. */
  doc: MilkdownNode;
  /** The new selection state. */
  selection: unknown;
}

/** Previous document state (before transaction). */
export interface MilkdownPrevDoc {
  nodeSize: number;
}
