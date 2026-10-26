import type { Fragment, Node as PMNode } from "@quirekit/pm";

/** One validated body replacement relative to the table node. */
export interface TablePasteBodyEdit {
  /** Position before the target cell. */
  readonly cellPos: number;
  /** Original target body size. */
  readonly size: number;
  /** Source body, including paragraph and inline formatting. */
  readonly content: Fragment;
}

/** Prepared structural paste; failure carries no partial mutations. */
export type TablePastePlan = {
  /** Expanded table, or the original for body-only replacement. */
  readonly table: PMNode;
  /** Body edits, or null when expansion requires table replacement. */
  readonly edits: readonly TablePasteBodyEdit[] | null;
} | {
  /** Stable rejection reason. */
  readonly reason: string;
};
