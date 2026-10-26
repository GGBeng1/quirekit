import type { SyntaxNode } from "@lezer/common";

/** A raw cell, including author whitespace, in canonical UTF-16 coordinates. */
export interface TableCell {
  /** Inclusive source start. */
  readonly from: number;
  /** Exclusive source end. */
  readonly to: number;
}

/** One confirmed row, retaining outer-pipe spelling for exact source edits. */
export interface TableRow {
  /** Accepted row node. */
  readonly node: SyntaxNode;
  /** Every source cell, including GFM surplus cells. */
  readonly cells: readonly TableCell[];
  /** Whether the author used a leading pipe. */
  readonly leading: boolean;
  /** Whether the author used a trailing pipe. */
  readonly trailing: boolean;
}

/** Local table context; discovering this never enumerates all table rows. */
export interface TableContext {
  /** Confirmed enclosing table. */
  readonly node: SyntaxNode;
  /** Confirmed header. */
  readonly header: SyntaxNode;
  /** Column alignment source. */
  readonly delimiter: SyntaxNode;
  /** Active source row. */
  readonly row: TableRow;
  /** Zero-based active column, bounded by the semantic grid. */
  readonly column: number;
  /** Semantic column count. */
  readonly columns: number;
}

/** Relative structural insertion side. */
export type TableSide = "before" | "after";
