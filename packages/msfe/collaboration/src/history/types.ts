import type { RelativePosition } from "yjs";

/** Source-relative representation of all local ranges, including the active range. */
export interface RelativeSelection {
  /** Range order retained by CodeMirror. */
  readonly ranges: readonly { readonly anchor: RelativePosition; readonly head: RelativePosition; readonly assoc: number }[];
  /** Index of the active range. */
  readonly mainIndex: number;
}
