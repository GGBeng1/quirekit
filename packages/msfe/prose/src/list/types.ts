import type { SyntaxNode } from "@lezer/common";

/** Canonical fields of a GFM task marker. */
export interface TaskAttributes {
  /** Checkbox state; all surrounding item source remains unchanged. */
  readonly checked: boolean;
}

/** Sibling items selected for one atomic structural move. */
export interface ListContext {
  /** Immediate shared list owner. */
  readonly list: SyntaxNode;
  /** Whole selected items, including their descendant blocks. */
  readonly items: readonly SyntaxNode[];
  /** Outer item, absent for a root list. */
  readonly parent: SyntaxNode | null;
  /** Number of enclosing quote containers before this list. */
  readonly quotes: number;
}
