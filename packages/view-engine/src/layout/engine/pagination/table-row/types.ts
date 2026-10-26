import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireTableCellRowLineSlice } from "../table-cell";

/** Measured table-row slice made from one or more overlapping cell text lines. */
export interface QuireTableRowMeasuredLineSlice {
  /** Document range represented by the slice. */
  readonly range: QuireDocumentRange;
  /** Source-flow top consumed by the slice. */
  readonly top: number;
  /** Source-flow bottom consumed by the slice. */
  readonly bottom: number;
  /** Cell-owned line slices that contributed to this measured row slice. */
  readonly cellLineSlices: readonly QuireTableCellRowLineSlice[];
}
